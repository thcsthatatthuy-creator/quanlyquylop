import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassAccess, requireClassManager } from '@/lib/permissions'
import { handle, ok, fail, optionalString, requireString } from '@/lib/api'
import { logActivity } from '@/lib/audit'

/**
 * GET /api/classes/[id] — tổng quan lớp (mọi thành viên + giáo viên + admin)
 * Số liệu tài chính được BACKEND tính toán, không tin frontend.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassAccess(id, ['ADMIN', 'OWNER', 'TREASURER', 'STUDENT'])

    const [memberCount, txAgg, violationAgg, recentTransactions, recentViolations] = await Promise.all([
      db.classMember.count({ where: { classId: id } }),
      db.fundTransaction.groupBy({
        by: ['type'],
        where: { classId: id },
        _sum: { amount: true },
      }),
      db.violation.aggregate({
        where: { classId: id },
        _sum: { amount: true },
        _count: true,
      }),
      db.fundTransaction.findMany({
        where: { classId: id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          student: { select: { fullName: true } },
          creator: { select: { fullName: true, systemRole: true } },
        },
      }),
      db.violation.findMany({
        where: { classId: id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          student: { select: { id: true, fullName: true } },
          violationType: { select: { name: true } },
          creator: { select: { fullName: true, systemRole: true } },
        },
      }),
    ])

    const rawIncome = txAgg.find((a) => a.type === 'INCOME')?._sum.amount ?? 0
    const expense = txAgg.find((a) => a.type === 'EXPENSE')?._sum.amount ?? 0
    const penaltyCollected = await db.fundTransaction.aggregate({
      where: { classId: id, type: 'INCOME', category: 'PENALTY_PAYMENT' },
      _sum: { amount: true },
    })
    
    const violationTotal = violationAgg._sum.amount ?? 0
    const penaltyIncome = penaltyCollected._sum.amount ?? 0
    const income = rawIncome - penaltyIncome + violationTotal

    return ok({
      class: ctx.class,
      access: ctx.access,
      stats: {
        memberCount,
        balance: income - expense,
        totalIncome: income,
        totalExpense: expense,
        penaltyCollected: penaltyIncome,
        violationTotal: violationTotal,
        violationCount: violationAgg._count,
      },
      recentTransactions,
      recentViolations,
    })
  })
}

/**
 * PATCH /api/classes/[id] — giáo viên sở hữu / admin sửa thông tin lớp
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassManager(id)
    const body = await req.json()

    const data: Record<string, string> = {}
    if (body.name !== undefined) data.name = requireString(body.name, 'Tên lớp', 50)
    if (body.schoolYear !== undefined) data.schoolYear = requireString(body.schoolYear, 'Năm học', 30)
    if (body.description !== undefined) data.description = optionalString(body.description, 500)

    const cls = await db.class.update({ where: { id }, data })
    await logActivity({
      userId: ctx.user.id,
      action: 'CLASS_UPDATED',
      targetType: 'CLASS',
      targetId: id,
      classId: id,
      metadata: { ...data },
    })
    return ok({ class: cls })
  })
}

/**
 * DELETE /api/classes/[id] — giáo viên sở hữu / admin xóa lớp (cascade toàn bộ dữ liệu liên quan)
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassManager(id)

    const cls = await db.class.findUnique({ where: { id } })
    if (!cls) return fail(404, 'Không tìm thấy lớp học.')

    await db.class.delete({ where: { id } })

    await logActivity({
      userId: ctx.user.id,
      action: 'CLASS_DELETED',
      targetType: 'CLASS',
      targetId: id,
      classId: id,
      metadata: { name: cls.name, schoolYear: cls.schoolYear },
    })
    return ok({ success: true })
  })
}
