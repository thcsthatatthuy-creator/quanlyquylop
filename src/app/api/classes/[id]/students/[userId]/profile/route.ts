import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassTreasurerLevel } from '@/lib/permissions'
import { handle, ok, fail } from '@/lib/api'

/**
 * GET /api/classes/[id]/students/[userId]/profile
 * Hồ sơ học sinh trong lớp (kèm lịch sử vi phạm) — giáo viên / thủ quỹ / admin.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  return handle(async () => {
    const { id, userId } = await params
    await requireClassTreasurerLevel(id)

    const membership = await db.classMember.findFirst({
      where: { classId: id, userId },
      include: {
        user: { select: { id: true, fullName: true, email: true, status: true, createdAt: true } },
      },
    })
    if (!membership) return fail(404, 'Học sinh không thuộc lớp này.')

    const violationAgg = await db.violation.aggregate({
      where: { classId: id, studentId: userId },
      _sum: { amount: true },
      _count: true,
    })

    const violations = await db.violation.findMany({
      where: { classId: id, studentId: userId },
      orderBy: { createdAt: 'desc' },
      include: { violationType: { select: { name: true } } },
    })

    // Tổng đã nộp (đóng quỹ + tiền phạt)
    const paidAgg = await db.fundTransaction.aggregate({
      where: { classId: id, studentId: userId, type: 'INCOME' },
      _sum: { amount: true },
    })

    return ok({
      student: {
        membershipId: membership.id,
        userId: membership.user.id,
        fullName: membership.user.fullName,
        email: membership.user.email,
        status: membership.user.status,
        classRole: membership.classRole,
        joinedAt: membership.createdAt,
        violationTotal: violationAgg._sum.amount ?? 0,
        violationCount: violationAgg._count,
        paidTotal: paidAgg._sum.amount ?? 0,
      },
      violations,
    })
  })
}
