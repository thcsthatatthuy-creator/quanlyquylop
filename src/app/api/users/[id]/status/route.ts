import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassManager, requireUser, ApiError } from '@/lib/permissions'
import { handle, ok, fail } from '@/lib/api'
import { logActivity } from '@/lib/audit'
import { STATUS_LABEL } from '@/lib/format'

/**
 * PATCH /api/users/[id]/status
 * Khóa / mở khóa tài khoản:
 *  - Admin: khóa/mở khóa bất kỳ ai
 *  - Giáo viên: chỉ khóa/mở khóa học sinh trong LỚP CỦA MÌNH
 * body: { status: 'ACTIVE' | 'SUSPENDED' }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const actor = await requireUser()

    const target = await db.user.findUnique({ where: { id } })
    if (!target) return fail(404, 'Không tìm thấy người dùng.')

    const body = await req.json()
    const newStatus = body.status
    if (newStatus !== 'ACTIVE' && newStatus !== 'SUSPENDED') {
      return fail(400, 'Trạng thái không hợp lệ.')
    }
    if (target.status === 'PENDING') {
      return fail(400, 'Tài khoản đang chờ duyệt. Hãy dùng chức năng duyệt của quản trị viên.')
    }

    let allowed = false
    let className: string | undefined
    let membershipClassId: string | null = null

    if (actor.systemRole === 'ADMIN') {
      if (target.systemRole === 'ADMIN' && target.id !== actor.id) {
        return fail(403, 'Không thể khóa tài khoản quản trị viên khác.')
      }
      allowed = true
    } else if (actor.systemRole === 'TEACHER') {
      // Chỉ học sinh đang thuộc ít nhất một lớp do giáo viên này sở hữu
      const membership = await db.classMember.findFirst({
        where: { userId: target.id, class: { teacherId: actor.id } },
        include: { class: { select: { name: true } } },
      })
      if (!membership) {
        throw new ApiError(403, 'Bạn chỉ có thể khóa/mở khóa học sinh thuộc lớp của mình.')
      }
      allowed = true
      className = membership.class.name
      membershipClassId = membership.classId
    } else {
      throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.')
    }

    if (!allowed) throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.')

    const updated = await db.user.update({
      where: { id },
      data: { status: newStatus },
    })

    await logActivity({
      userId: actor.id,
      action: newStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      targetType: 'USER',
      targetId: id,
      classId: className ? membershipClassId : null,
      metadata: {
        targetName: target.fullName,
        targetEmail: target.email,
        from: STATUS_LABEL[target.status],
        to: STATUS_LABEL[newStatus],
        className,
      },
    })

    return ok({ user: { id: updated.id, status: updated.status } })
  })
}
