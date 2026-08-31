import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassTreasurerLevel, ApiError } from '@/lib/permissions'
import { handle, ok, fail, parseAmount, optionalString } from '@/lib/api'
import { logActivity } from '@/lib/audit'
import { formatVND, TX_CATEGORY_LABEL } from '@/lib/format'

const INCOME_CATEGORIES = ['FUND_CONTRIBUTION', 'PENALTY_PAYMENT', 'OTHER_INCOME']
const EXPENSE_CATEGORIES = ['SUPPLIES', 'ACTIVITY', 'DECORATION', 'OTHER_EXPENSE']

/**
 * GET /api/classes/[id]/transactions — Sổ quỹ
 * Query: ?type=all|INCOME|EXPENSE|PENALTY_PAYMENT&from=&to=&page=&pageSize=
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassTreasurerLevel(id)

    const url = new URL(req.url)
    const typeFilter = url.searchParams.get('type') ?? 'all'
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1)
    const pageSize = Math.min(200, Math.max(5, parseInt(url.searchParams.get('pageSize') ?? '50') || 50))

    const where: Record<string, unknown> = { classId: id }
    if (typeFilter === 'INCOME') where.type = 'INCOME'
    else if (typeFilter === 'EXPENSE') where.type = 'EXPENSE'
    else if (typeFilter === 'PENALTY_PAYMENT') {
      where.type = 'INCOME'
      where.category = 'PENALTY_PAYMENT'
    }
    if (from || to) {
      const createdAt: Record<string, Date> = {}
      if (from) createdAt.gte = new Date(`${from}T00:00:00`)
      if (to) createdAt.lte = new Date(`${to}T23:59:59.999`)
      where.createdAt = createdAt
    }

    const [total, transactions] = await Promise.all([
      db.fundTransaction.count({ where }),
      db.fundTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          student: { select: { id: true, fullName: true } },
          creator: { select: { id: true, fullName: true, systemRole: true } },
        },
      }),
    ])

    return ok({
      transactions,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      access: ctx.access,
    })
  })
}

/**
 * POST /api/classes/[id]/transactions
 * Thêm khoản thu / khoản chi. Số dư do BACKEND tính từ toàn bộ giao dịch — frontend không tự quyết.
 * body: { type: INCOME|EXPENSE, category, amount, studentId?, description, note?, date? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassTreasurerLevel(id)

    const body = await req.json()
    const type = body.type === 'INCOME' ? 'INCOME' : body.type === 'EXPENSE' ? 'EXPENSE' : null
    if (!type) return fail(400, 'Loại giao dịch không hợp lệ.')

    const category = typeof body.category === 'string' ? body.category : ''
    const validCategories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    if (!validCategories.includes(category)) {
      return fail(400, 'Danh mục không hợp lệ với loại giao dịch này.')
    }

    const amount = parseAmount(body.amount)
    const description = optionalString(body.description, 300)
    const note = optionalString(body.note, 500)

    let studentId: string | null = null
    if (body.studentId) {
      if (typeof body.studentId !== 'string') throw new ApiError(400, 'Học sinh không hợp lệ.')
      // Học sinh nhận khoản thu phải thuộc lớp này
      const membership = await db.classMember.findFirst({
        where: { classId: id, userId: body.studentId },
        include: { user: { select: { fullName: true } } },
      })
      if (!membership) throw new ApiError(400, 'Học sinh không thuộc lớp này.')
      studentId = body.studentId
    }

    // Khoản thu tiền phạt bắt buộc gắn với học sinh
    if (category === 'PENALTY_PAYMENT' && !studentId) {
      return fail(400, 'Khoản thu tiền phạt phải chọn học sinh nộp.')
    }
    if (type === 'EXPENSE' && studentId) {
      return fail(400, 'Khoản chi không được gắn với học sinh.')
    }

    const date = body.date ? new Date(`${body.date}T${new Date().toTimeString().slice(0, 8)}`) : new Date()
    if (isNaN(date.getTime())) return fail(400, 'Ngày giao dịch không hợp lệ.')
    if (date.getTime() > Date.now() + 24 * 3600 * 1000) {
      return fail(400, 'Không thể tạo giao dịch trong tương lai.')
    }

    const tx = await db.fundTransaction.create({
      data: {
        classId: id,
        type,
        category,
        amount,
        studentId,
        description: description || TX_CATEGORY_LABEL[category],
        note,
        createdBy: ctx.user.id,
        createdAt: date,
      },
      include: {
        student: { select: { fullName: true } },
        creator: { select: { fullName: true, systemRole: true } },
      },
    })

    await logActivity({
      userId: ctx.user.id,
      action: 'TRANSACTION_CREATED',
      targetType: 'FUND_TRANSACTION',
      targetId: tx.id,
      classId: id,
      metadata: {
        type: type === 'INCOME' ? 'Thu' : 'Chi',
        category: TX_CATEGORY_LABEL[category],
        amount: formatVND(amount),
        studentName: tx.student?.fullName ?? null,
        description: tx.description,
        className: ctx.class.name,
      },
    })

    // Số dư mới do backend tính lại
    const agg = await db.fundTransaction.groupBy({
      by: ['type'],
      where: { classId: id },
      _sum: { amount: true },
    })
    const income = agg.find((a) => a.type === 'INCOME')?._sum.amount ?? 0
    const expense = agg.find((a) => a.type === 'EXPENSE')?._sum.amount ?? 0

    return ok({ transaction: tx, balance: income - expense }, 201)
  })
}
