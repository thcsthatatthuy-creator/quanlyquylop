import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassTreasurerLevel, requireClassManager, ApiError } from '@/lib/permissions'
import { handle, ok, fail, parseAmount, optionalString } from '@/lib/api'
import { logActivity } from '@/lib/audit'
import { formatVND } from '@/lib/format'

/**
 * GET /api/classes/[id]/violations
 * Lịch sử vi phạm của lớp — teacher/treasurer/admin xem toàn bộ.
 * Query: ?studentId=&typeId=&from=&to=&page=&pageSize=
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassTreasurerLevel(id)

    const url = new URL(req.url)
    const studentId = url.searchParams.get('studentId') ?? ''
    const typeId = url.searchParams.get('typeId') ?? ''
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1)
    const pageSize = Math.min(200, Math.max(5, parseInt(url.searchParams.get('pageSize') ?? '50') || 50))

    const where: Record<string, unknown> = { classId: id }
    if (studentId) where.studentId = studentId
    if (typeId) where.violationTypeId = typeId
    if (from || to) {
      const createdAt: Record<string, Date> = {}
      if (from) createdAt.gte = new Date(`${from}T00:00:00`)
      if (to) createdAt.lte = new Date(`${to}T23:59:59.999`)
      where.createdAt = createdAt
    }

    const [total, violations] = await Promise.all([
      db.violation.count({ where }),
      db.violation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          student: { select: { id: true, fullName: true } },
          violationType: { select: { id: true, name: true } },
          creator: { select: { id: true, fullName: true, systemRole: true } },
        },
      }),
    ])

    const agg = await db.violation.aggregate({ where, _sum: { amount: true } })

    return ok({
      violations,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      totalAmount: agg._sum.amount ?? 0,
      access: ctx.access,
    })
  })
}

/**
 * POST /api/classes/[id]/violations
 * Chỉ TEACHER (sở hữu lớp) / TREASURER (trong lớp mình) / ADMIN được thêm vi phạm.
 * Tiền phạt CHƯA vào quỹ — chỉ tạo nghĩa vụ phải nộp cho học sinh.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassTreasurerLevel(id)

    const body = await req.json()
    const studentId = typeof body.studentId === 'string' ? body.studentId : ''
    const violationTypeId = typeof body.violationTypeId === 'string' ? body.violationTypeId : ''
    if (!studentId) return fail(400, 'Vui lòng chọn học sinh.')
    if (!violationTypeId) return fail(400, 'Vui lòng chọn loại vi phạm.')

    // Học sinh phải thuộc lớp này
    const membership = await db.classMember.findFirst({
      where: { classId: id, userId: studentId },
      include: { user: { select: { fullName: true } } },
    })
    if (!membership) {
      throw new ApiError(400, 'Học sinh không thuộc lớp này.')
    }

    const type = await db.violationType.findFirst({
      where: { id: violationTypeId, classId: id },
    })
    if (!type) return fail(400, 'Loại vi phạm không thuộc lớp này.')
    if (!type.active) return fail(400, 'Loại vi phạm này đã bị vô hiệu hóa.')

    // Số tiền: mặc định lấy từ danh mục, giáo viên/thủ quỹ có thể chỉnh nếu hệ thống cho phép
    const amount = body.amount !== undefined && body.amount !== '' ? parseAmount(body.amount) : type.amount

    const note = optionalString(body.note, 500)
    const date = body.date ? new Date(`${body.date}T${new Date().toTimeString().slice(0, 8)}`) : new Date()
    if (isNaN(date.getTime())) return fail(400, 'Ngày vi phạm không hợp lệ.')
    if (date.getTime() > Date.now() + 24 * 3600 * 1000) {
      return fail(400, 'Không thể ghi nhận vi phạm trong tương lai.')
    }

    const violation = await db.violation.create({
      data: {
        classId: id,
        studentId,
        violationTypeId,
        amount,
        note,
        createdBy: ctx.user.id,
        createdAt: date,
      },
      include: {
        student: { select: { fullName: true } },
        violationType: { select: { name: true } },
      },
    })

    await logActivity({
      userId: ctx.user.id,
      action: 'VIOLATION_CREATED',
      targetType: 'VIOLATION',
      targetId: violation.id,
      classId: id,
      metadata: {
        studentName: violation.student.fullName,
        typeName: violation.violationType.name,
        amount: formatVND(amount),
        className: ctx.class.name,
        note,
      },
    })

    return ok({ violation }, 201)
  })
}
