import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, ApiError } from '@/lib/permissions'
import { handle, ok, fail, requireString } from '@/lib/api'
import { logActivity } from '@/lib/audit'
import { hashPassword } from '@/lib/auth'
import { STATUS_LABEL } from '@/lib/format'

/**
 * PATCH /api/admin/users/[id] — admin cập nhật người dùng
 * body: { action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'ACTIVATE' | 'RESET_PASSWORD' | 'UPDATE_INFO', ... }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const admin = await requireRole('ADMIN')

    const target = await db.user.findUnique({ where: { id } })
    if (!target) return fail(404, 'Không tìm thấy người dùng.')

    const body = await req.json()
    const action = typeof body.action === 'string' ? body.action : ''

    switch (action) {
      case 'APPROVE': {
        if (target.systemRole !== 'TEACHER') return fail(400, 'Chỉ duyệt tài khoản giáo viên.')
        if (target.status !== 'PENDING') return fail(400, 'Tài khoản không ở trạng thái chờ duyệt.')
        await db.user.update({ where: { id }, data: { status: 'ACTIVE' } })
        await logActivity({
          userId: admin.id,
          action: 'TEACHER_APPROVED',
          targetType: 'USER',
          targetId: id,
          metadata: { teacherName: target.fullName, email: target.email },
        })
        return ok({ success: true, message: 'Đã duyệt giáo viên.' })
      }
      case 'REJECT': {
        if (target.systemRole !== 'TEACHER') return fail(400, 'Chỉ áp dụng cho giáo viên.')
        if (target.status !== 'PENDING') return fail(400, 'Tài khoản không ở trạng thái chờ duyệt.')
        await db.user.delete({ where: { id } })
        await logActivity({
          userId: admin.id,
          action: 'TEACHER_REJECTED',
          targetType: 'USER',
          targetId: id,
          metadata: { teacherName: target.fullName, email: target.email },
        })
        return ok({ success: true, message: 'Đã từ chối và xóa yêu cầu đăng ký.' })
      }
      case 'SUSPEND':
      case 'ACTIVATE': {
        const newStatus = action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE'
        if (target.systemRole === 'ADMIN') {
          return fail(403, 'Không thể khóa tài khoản quản trị viên.')
        }
        if (target.status === 'PENDING' && action === 'SUSPEND') {
          return fail(400, 'Tài khoản đang chờ duyệt.')
        }
        await db.user.update({ where: { id }, data: { status: newStatus } })
        await logActivity({
          userId: admin.id,
          action: action === 'SUSPEND' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
          targetType: 'USER',
          targetId: id,
          metadata: { targetName: target.fullName, to: STATUS_LABEL[newStatus] },
        })
        return ok({ success: true })
      }
      case 'RESET_PASSWORD': {
        const password = typeof body.newPassword === 'string' ? body.newPassword : ''
        if (password.length < 6) return fail(400, 'Mật khẩu mới phải có ít nhất 6 ký tự.')
        const passwordHash = await hashPassword(password)
        await db.user.update({ where: { id }, data: { passwordHash } })
        await logActivity({
          userId: admin.id,
          action: 'PASSWORD_RESET',
          targetType: 'USER',
          targetId: id,
          metadata: { targetName: target.fullName, targetEmail: target.email },
        })
        return ok({ success: true })
      }
      case 'UPDATE_INFO': {
        const data: Record<string, string> = {}
        if (body.fullName !== undefined) data.fullName = requireString(body.fullName, 'Họ và tên', 100)
        if (body.email !== undefined) {
          const email = requireString(body.email, 'Email', 200).toLowerCase()
          const dup = await db.user.findFirst({ where: { email, id: { not: id } } })
          if (dup) return fail(409, 'Email này đã được sử dụng. Vui lòng sử dụng email khác.')
          data.email = email
        }
        const updated = await db.user.update({ where: { id }, data })
        await logActivity({
          userId: admin.id,
          action: 'USER_UPDATED',
          targetType: 'USER',
          targetId: id,
          metadata: { targetName: updated.fullName, ...data },
        })
        return ok({ success: true })
      }
      default:
        throw new ApiError(400, 'Hành động không hợp lệ.')
    }
  })
}

/**
 * DELETE /api/admin/users/[id] — xóa hẳn tài khoản (cascade dữ liệu liên quan), ghi audit log
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const admin = await requireRole('ADMIN')

    const target = await db.user.findUnique({ where: { id } })
    if (!target) return fail(404, 'Không tìm thấy người dùng.')
    if (target.systemRole === 'ADMIN') {
      return fail(403, 'Không thể xóa tài khoản quản trị viên.')
    }

    await db.user.delete({ where: { id } })
    await logActivity({
      userId: admin.id,
      action: 'USER_DELETED',
      targetType: 'USER',
      targetId: id,
      metadata: {
        targetName: target.fullName,
        targetEmail: target.email,
      },
    })

    return ok({ success: true })
  })
}
