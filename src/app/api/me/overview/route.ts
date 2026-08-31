import { db } from '@/lib/db'
import { requireUser, ApiError } from '@/lib/permissions'
import { handle, ok } from '@/lib/api'
import { CLASS_ROLE_LABEL } from '@/lib/format'

/**
 * GET /api/me/overview — dashboard học sinh
 * Học sinh chỉ thấy: thông tin lớp, tổng tiền vi phạm của mình, số lần vi phạm,
 * số dư quỹ lớp (backend tính), trạng thái nộp tiền phạt của mình.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()

    const membership = await db.classMember.findFirst({
      where: { userId: user.id },
      include: { class: { include: { teacher: { select: { fullName: true } } } } },
    })

    // Tổng vi phạm của chính mình
    const violationAgg = await db.violation.aggregate({
      where: { studentId: user.id },
      _sum: { amount: true },
      _count: true,
    })

    // Tiền phạt mình đã nộp
    const paidAgg = await db.fundTransaction.aggregate({
      where: { studentId: user.id, type: 'INCOME' },
      _sum: { amount: true },
    })

    // Số dư quỹ lớp do BACKEND tính
    let classBalance = 0
    let classIncome = 0
    let classExpense = 0
    let classMemberCount = 0
    if (membership) {
      const agg = await db.fundTransaction.groupBy({
        by: ['type'],
        where: { classId: membership.classId },
        _sum: { amount: true },
      })
      classIncome = agg.find((a) => a.type === 'INCOME')?._sum.amount ?? 0
      classExpense = agg.find((a) => a.type === 'EXPENSE')?._sum.amount ?? 0
      classBalance = classIncome - classExpense
      classMemberCount = await db.classMember.count({ where: { classId: membership.classId } })
    }

    // Vi phạm gần đây
    const recentViolations = await db.violation.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { violationType: { select: { name: true } } },
    })

    if (!membership && user.systemRole !== 'STUDENT') {
      throw new ApiError(400, 'Tài khoản không hợp lệ.')
    }

    return ok({
      profile: {
        fullName: user.fullName,
        email: user.email,
      },
      classInfo: membership
        ? {
            id: membership.classId,
            name: membership.class.name,
            schoolYear: membership.class.schoolYear,
            teacherName: membership.class.teacher.fullName,
            myClassRole: membership.classRole,
            myClassRoleLabel: CLASS_ROLE_LABEL[membership.classRole],
            memberCount: classMemberCount,
          }
        : null,
      myStats: {
        violationTotal: violationAgg._sum.amount ?? 0,
        violationCount: violationAgg._count,
        paidTotal: paidAgg._sum.amount ?? 0,
        remainingToPay:
          Math.max(0, (violationAgg._sum.amount ?? 0) - (paidAgg._sum.amount ?? 0)),
      },
      classFund: membership ? { balance: classBalance, income: classIncome, expense: classExpense } : null,
      recentViolations,
    })
  })
}
