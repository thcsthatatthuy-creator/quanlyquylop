import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, setSessionCookie } from '@/lib/auth'
import { handle, ok, fail } from '@/lib/api'
import { logActivity } from '@/lib/audit'

/**
 * POST /api/auth/login
 * body: { email, password }
 * KHÔNG yêu cầu nhập mã lớp — hệ thống tự xác định lớp qua class_members.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return fail(400, 'Vui lòng nhập email và mật khẩu.')
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return fail(401, 'Email hoặc mật khẩu không đúng.')
    }

    if (user.status === 'SUSPENDED') {
      return fail(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ giáo viên hoặc quản trị viên.')
    }
    if (user.status === 'PENDING') {
      return fail(403, 'Tài khoản giáo viên đang chờ quản trị viên duyệt. Vui lòng thử lại sau.')
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return fail(401, 'Email hoặc mật khẩu không đúng.')
    }

    await setSessionCookie({ userId: user.id, systemRole: user.systemRole as 'ADMIN' | 'TEACHER' | 'STUDENT' })

    await logActivity({
      userId: user.id,
      action: 'LOGIN',
      targetType: 'USER',
      targetId: user.id,
      metadata: { email },
    })

    return ok({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        systemRole: user.systemRole,
        status: user.status,
      },
    })
  })
}
