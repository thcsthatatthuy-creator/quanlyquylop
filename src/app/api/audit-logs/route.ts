import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ApiError } from '@/lib/permissions'
import { handle, ok } from '@/lib/api'
import { ACTION_LABEL } from '@/lib/format'

/**
 * GET /api/audit-logs — lịch sử hoạt động (chỉ đọc, không ai được sửa/xóa log)
 *  - Admin: toàn hệ thống
 *  - Giáo viên: log các lớp mình sở hữu + log do mình tạo
 *  - Thủ quỹ: log của lớp mình được gán
 *  - Học sinh: KHÔNG được xem
 * Query: ?classId=&page=&pageSize=
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    if (user.systemRole === 'STUDENT') {
      throw new ApiError(403, 'Bạn không có quyền xem lịch sử hoạt động.')
    }

    const url = new URL(req.url)
    const classIdParam = url.searchParams.get('classId') ?? ''
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1)
    const pageSize = Math.min(100, Math.max(5, parseInt(url.searchParams.get('pageSize') ?? '30') || 30))

    let where: Record<string, unknown> = {}

    if (user.systemRole === 'ADMIN') {
      where = classIdParam ? { classId: classIdParam } : {}
    } else if (user.systemRole === 'TEACHER') {
      const myClasses = await db.class.findMany({ where: { teacherId: user.id }, select: { id: true } })
      const ids = myClasses.map((c) => c.id)
      if (classIdParam && ids.includes(classIdParam)) {
        where = { classId: classIdParam }
      } else if (classIdParam) {
        throw new ApiError(403, 'Bạn không có quyền xem log của lớp này.')
      } else {
        where = {
          OR: [
            { userId: user.id },
            { classId: { in: ids } },
          ],
        }
      }
    } else {
      // Thủ quỹ: chỉ log của lớp mình
      const memberships = await db.classMember.findMany({
        where: { userId: user.id, classRole: 'TREASURER' },
        select: { classId: true },
      })
      const ids = memberships.map((m) => m.classId)
      where = { classId: { in: ids } }
      if (classIdParam && ids.includes(classIdParam)) where = { classId: classIdParam }
    }

    const [total, logs] = await Promise.all([
      db.activityLog.count({ where }),
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, fullName: true, systemRole: true } },
        },
      }),
    ])

    return ok({
      logs: logs.map((l) => ({
        id: l.id,
        user: l.user,
        action: l.action,
        actionLabel: ACTION_LABEL[l.action] ?? l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        classId: l.classId,
        metadata: l.metadata ? JSON.parse(l.metadata) : null,
        createdAt: l.createdAt,
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  })
}
