import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassManager } from '@/lib/permissions'
import { hashPassword } from '@/lib/auth'
import { handle, ok, fail } from '@/lib/api'
import { logActivity } from '@/lib/audit'

/**
 * POST /api/classes/[id]/students/[userId]/reset-password
 * Giáo viên đặt lại mật khẩu cho học sinh trong lớp mình.
 * KHÔNG bao giờ cho phép xem mật khẩu hiện tại — chỉ ghi đè bằng hash mới.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  return handle(async () => {
    const { id, userId } = await params
    const ctx = await requireClassManager(id)

    const member = await db.classMember.findFirst({
      where: { userId, classId: id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    })
    if (!member) return fail(404, 'Không tìm thấy thành viên trong lớp.')

    const body = await req.json()
    const password = typeof body.newPassword === 'string' ? body.newPassword : ''
    if (password.length < 6) {
      return fail(400, 'Mật khẩu mới phải có ít nhất 6 ký tự.')
    }

    const passwordHash = await hashPassword(password)
    await db.user.update({
      where: { id: member.user.id },
      data: { passwordHash },
    })

    await logActivity({
      userId: ctx.user.id,
      action: 'PASSWORD_RESET',
      targetType: 'USER',
      targetId: member.user.id,
      classId: id,
      metadata: {
        targetName: member.user.fullName,
        targetEmail: member.user.email,
        className: ctx.class.name,
      },
    })

    return ok({ success: true })
  })
}
