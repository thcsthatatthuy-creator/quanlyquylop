import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassTreasurerLevel } from '@/lib/permissions'
import { handle, ok } from '@/lib/api'

/**
 * GET /api/classes/[id]/stats — dữ liệu dashboard & biểu đồ
 * Backend tổng hợp toàn bộ số liệu:
 *  - Số dư / tổng thu / tổng chi / tiền phạt đã thu
 *  - Chuỗi thu-chi-phạt theo tháng (6 tháng gần nhất)
 *  - Cơ cấu chi theo danh mục (donut)
 *  - Thống kê vi phạm theo loại (top)
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    await requireClassTreasurerLevel(id)

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const [txAgg, penaltyAgg, violationAgg, transactions, violations, memberCount] = await Promise.all([
      db.fundTransaction.groupBy({
        by: ['type'],
        where: { classId: id },
        _sum: { amount: true },
      }),
      db.fundTransaction.aggregate({
        where: { classId: id, type: 'INCOME', category: 'PENALTY_PAYMENT' },
        _sum: { amount: true },
      }),
      db.violation.aggregate({
        where: { classId: id },
        _sum: { amount: true },
        _count: true,
      }),
      db.fundTransaction.findMany({
        where: { classId: id, createdAt: { gte: sixMonthsAgo } },
        select: { type: true, category: true, amount: true, createdAt: true },
      }),
      db.violation.findMany({
        where: { classId: id },
        select: { amount: true, violationTypeId: true, violationType: { select: { name: true } } },
      }),
      db.classMember.count({ where: { classId: id } }),
    ])

    const income = txAgg.find((a) => a.type === 'INCOME')?._sum.amount ?? 0
    const expense = txAgg.find((a) => a.type === 'EXPENSE')?._sum.amount ?? 0

    // Chuỗi theo tháng: thu / chi / tiền phạt
    const monthlyMap = new Map<string, { month: string; thu: number; chi: number; phat: number }>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1) // tránh tràn ngày khi lùi tháng (vd: 31/4 không tồn tại)
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `T${d.getMonth() + 1}`
      monthlyMap.set(key, { month: label, thu: 0, chi: 0, phat: 0 })
    }
    for (const tx of transactions) {
      const d = new Date(tx.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = monthlyMap.get(key)
      if (!bucket) continue
      if (tx.type === 'INCOME') {
        bucket.thu += tx.amount
        if (tx.category === 'PENALTY_PAYMENT') bucket.phat += tx.amount
      } else {
        bucket.chi += tx.amount
      }
    }
    const monthly = Array.from(monthlyMap.values())

    // Cơ cấu chi theo danh mục
    const expenseByCategoryMap = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.type === 'EXPENSE') {
        expenseByCategoryMap.set(tx.category, (expenseByCategoryMap.get(tx.category) ?? 0) + tx.amount)
      }
    }
    const expenseByCategory = Array.from(expenseByCategoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    }))

    // Thống kê vi phạm theo loại
    const violationByTypeMap = new Map<string, { name: string; count: number; amount: number }>()
    for (const v of violations) {
      const key = v.violationTypeId
      const cur = violationByTypeMap.get(key) ?? { name: v.violationType.name, count: 0, amount: 0 }
      cur.count += 1
      cur.amount += v.amount
      violationByTypeMap.set(key, cur)
    }
    const violationByType = Array.from(violationByTypeMap.values()).sort((a, b) => b.count - a.count)

    return ok({
      stats: {
        memberCount,
        balance: income - expense,
        totalIncome: income,
        totalExpense: expense,
        penaltyCollected: penaltyAgg._sum.amount ?? 0,
        violationTotal: violationAgg._sum.amount ?? 0,
        violationCount: violationAgg._count,
      },
      monthly,
      expenseByCategory,
      violationByType,
    })
  })
}
