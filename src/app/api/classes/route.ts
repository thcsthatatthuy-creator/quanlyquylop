import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/permissions'
import { handle, ok, fail, requireString, optionalString } from '@/lib/api'
import { logActivity } from '@/lib/audit'

/**
 * GET /api/classes — danh sách lớp của giáo viên (hoặc toàn bộ với admin)
 */
export async function GET() {
  return handle(async () => {
    const user = await requireRole('ADMIN', 'TEACHER')

    const classes = await db.class.findMany({
      where: user.systemRole === 'ADMIN' ? {} : { teacherId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            members: true,
            violations: true,
            transactions: true,
          },
        },
      },
    })

    // Tính nhanh số dư quỹ từng lớp để hiển thị trên dashboard
    const withBalance = await Promise.all(
      classes.map(async (c) => {
        const agg = await db.fundTransaction.groupBy({
          by: ['type'],
          where: { classId: c.id },
          _sum: { amount: true },
        })
        const income = agg.find((a) => a.type === 'INCOME')?._sum.amount ?? 0
        const expense = agg.find((a) => a.type === 'EXPENSE')?._sum.amount ?? 0
        return { ...c, balance: income - expense }
      })
    )

    return ok({ classes: withBalance })
  })
}

/**
 * POST /api/classes — giáo viên tạo lớp mới (admin cũng được)
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole('ADMIN', 'TEACHER')

    // Giáo viên phải ACTIVE (admin đã duyệt)
    if (user.systemRole === 'TEACHER') {
      const fresh = await db.user.findUnique({ where: { id: user.id } })
      if (!fresh || fresh.status !== 'ACTIVE') {
        return fail(403, 'Tài khoản chưa được kích hoạt.')
      }
    }

    const body = await req.json()
    const name = requireString(body.name, 'Tên lớp', 50)
    const schoolYear = requireString(body.schoolYear, 'Năm học', 30)
    const description = optionalString(body.description, 500)

    const cls = await db.class.create({
      data: {
        name,
        schoolYear,
        description,
        teacherId: user.id,
      },
    })

    await logActivity({
      userId: user.id,
      action: 'CLASS_CREATED',
      targetType: 'CLASS',
      targetId: cls.id,
      classId: cls.id,
      metadata: { name, schoolYear },
    })

    return ok({ class: cls }, 201)
  })
}
