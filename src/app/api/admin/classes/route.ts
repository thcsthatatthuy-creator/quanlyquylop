import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/permissions'
import { handle, ok } from '@/lib/api'

/**
 * GET /api/admin/classes — toàn bộ lớp học (admin)
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireRole('ADMIN')

    const url = new URL(req.url)
    const search = url.searchParams.get('search')?.trim().toLowerCase() ?? ''

    const classes = await db.class.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        _count: { select: { members: true, violations: true, transactions: true } },
      },
    })

    const txAgg = await db.fundTransaction.groupBy({
      by: ['type', 'classId'],
      _sum: { amount: true },
    })

    let rows = classes.map((c) => {
      const income = txAgg.find((a) => a.classId === c.id && a.type === 'INCOME')?._sum.amount ?? 0
      const expense = txAgg.find((a) => a.classId === c.id && a.type === 'EXPENSE')?._sum.amount ?? 0
      return { ...c, balance: income - expense }
    })
    if (search) {
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.teacher.fullName.toLowerCase().includes(search)
      )
    }

    return ok({ classes: rows })
  })
}
