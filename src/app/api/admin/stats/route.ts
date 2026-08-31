import { db } from '@/lib/db'
import { requireRole } from '@/lib/permissions'
import { handle, ok } from '@/lib/api'

/**
 * GET /api/admin/stats — dashboard quản trị viên
 */
export async function GET() {
  return handle(async () => {
    await requireRole('ADMIN')

    const [totalUsers, totalTeachers, totalStudents, pendingTeachers, totalClasses, txAgg] =
      await Promise.all([
        db.user.count(),
        db.user.count({ where: { systemRole: 'TEACHER' } }),
        db.user.count({ where: { systemRole: 'STUDENT' } }),
        db.user.count({ where: { systemRole: 'TEACHER', status: 'PENDING' } }),
        db.class.count(),
        db.fundTransaction.groupBy({
          by: ['type'],
          _sum: { amount: true },
        }),
      ])

    const income = txAgg.find((a) => a.type === 'INCOME')?._sum.amount ?? 0
    const expense = txAgg.find((a) => a.type === 'EXPENSE')?._sum.amount ?? 0

    const violationAgg = await db.violation.aggregate({ _sum: { amount: true }, _count: true })
    const recentUsers = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, fullName: true, email: true, systemRole: true, status: true, createdAt: true },
    })

    return ok({
      stats: {
        totalUsers,
        totalTeachers,
        totalStudents,
        pendingTeachers,
        totalClasses,
        totalFundBalance: income - expense,
        violationTotal: violationAgg._sum.amount ?? 0,
        violationCount: violationAgg._count,
      },
      recentUsers,
    })
  })
}
