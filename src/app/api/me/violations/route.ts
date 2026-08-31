import { db } from '@/lib/db'
import { requireUser } from '@/lib/permissions'
import { handle, ok } from '@/lib/api'

/**
 * GET /api/me/violations — lịch sử vi phạm CỦA CHÍNH MÌNH (học sinh)
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()

    const violations = await db.violation.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        violationType: { select: { name: true } },
        creator: { select: { fullName: true, systemRole: true } },
      },
    })

    const agg = await db.violation.aggregate({
      where: { studentId: user.id },
      _sum: { amount: true },
      _count: true,
    })

    return ok({
      violations,
      totalAmount: agg._sum.amount ?? 0,
      totalCount: agg._count,
    })
  })
}
