import { db } from '@/lib/db'
import { requireUser } from '@/lib/permissions'
import { handle, ok } from '@/lib/api'

/**
 * GET /api/me/transactions — các khoản tôi đã nộp (đóng quỹ / tiền phạt)
 * Học sinh chỉ được xem giao dịch của bản thân.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()

    const transactions = await db.fundTransaction.findMany({
      where: { studentId: user.id, type: 'INCOME' },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { fullName: true, systemRole: true } } },
    })

    const agg = await db.fundTransaction.aggregate({
      where: { studentId: user.id, type: 'INCOME' },
      _sum: { amount: true },
    })

    return ok({
      transactions,
      totalPaid: agg._sum.amount ?? 0,
    })
  })
}
