import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassManager } from '@/lib/permissions'
import { handle, ok } from '@/lib/api'
import { logActivity } from '@/lib/audit'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    await requireClassManager(id)

    // Check if there is a summary from the last 2 days
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const recentSummary = await db.classSummary.findFirst({
      where: { classId: id, createdAt: { gte: twoDaysAgo } },
      orderBy: { createdAt: 'desc' },
    })

    if (recentSummary) {
      return ok({
        isArchived: true,
        summary: JSON.parse(recentSummary.data),
        createdAt: recentSummary.createdAt
      })
    }

    // Compute current leaderboard
    const violations = await db.violation.findMany({
      where: { classId: id },
      include: { student: { select: { fullName: true } } }
    })

    const studentTotals = new Map<string, { id: string, name: string, total: number }>()
    for (const v of violations) {
      const cur = studentTotals.get(v.studentId) ?? { id: v.studentId, name: v.student?.fullName ?? 'Unknown', total: 0 }
      cur.total += v.amount
      studentTotals.set(v.studentId, cur)
    }

    const leaderboard = Array.from(studentTotals.values()).sort((a, b) => b.total - a.total)

    return ok({
      isArchived: false,
      summary: {
        leaderboard
      }
    })
  })
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassManager(id)

    // Compute current leaderboard before wiping
    const violations = await db.violation.findMany({
      where: { classId: id },
      include: { student: { select: { fullName: true } } }
    })

    const studentTotals = new Map<string, { id: string, name: string, total: number }>()
    let totalCollected = 0
    for (const v of violations) {
      const cur = studentTotals.get(v.studentId) ?? { id: v.studentId, name: v.student?.fullName ?? 'Unknown', total: 0 }
      cur.total += v.amount
      totalCollected += v.amount
      studentTotals.set(v.studentId, cur)
    }

    const leaderboard = Array.from(studentTotals.values()).sort((a, b) => b.total - a.total)

    const data = JSON.stringify({ leaderboard, totalCollected })

    // Use transaction to ensure data integrity
    await db.$transaction([
      db.classSummary.create({
        data: {
          classId: id,
          name: 'Tổng kết năm học',
          data
        }
      }),
      db.violation.deleteMany({ where: { classId: id } }),
      db.fundTransaction.deleteMany({ where: { classId: id } })
    ])

    await logActivity({
      userId: ctx.user.id,
      action: 'CLASS_SUMMARIZED',
      targetType: 'CLASS',
      targetId: id,
      classId: id,
    })

    return ok({ success: true })
  })
}
