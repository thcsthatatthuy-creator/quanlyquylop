import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, isValidEmail, setSessionCookie } from '@/lib/auth'
import { handle, ok, fail, requireString } from '@/lib/api'
import { logActivity } from '@/lib/audit'

/**
 * POST /api/auth/register
 * body: { fullName, email, password, accountType: 'STUDENT' | 'TEACHER' }
 *
 * - Học sinh: ACTIVE ngay, nhưng chưa thuộc lớp nào (chờ giáo viên/admin thêm vào lớp)
 * - Giáo viên: PENDING — phải chờ admin duyệt mới dùng được hệ thống
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json()
    const fullName = requireString(body.fullName, 'Họ và tên', 100)
    const email = requireString(body.email, 'Email', 200).toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''
    const accountType = body.accountType === 'TEACHER' ? 'TEACHER' : 'STUDENT'

    if (!isValidEmail(email)) {
      return fail(400, 'Email không đúng định dạng.')
    }
    if (password.length < 6) {
      return fail(400, 'Mật khẩu phải có ít nhất 6 ký tự.')
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return fail(409, 'Email này đã được sử dụng. Vui lòng sử dụng email khác.')
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        systemRole: accountType,
        status: accountType === 'TEACHER' ? 'PENDING' : 'ACTIVE',
      },
      select: { id: true, fullName: true, email: true, systemRole: true, status: true },
    })

    await logActivity({
      userId: user.id,
      action: 'REGISTER',
      targetType: 'USER',
      targetId: user.id,
      metadata: { email, accountType, status: user.status },
    })

    // Học sinh đăng ký thành công có thể đăng nhập luôn (dù chưa có lớp)
    if (accountType === 'STUDENT' && user.status === 'ACTIVE') {
      await setSessionCookie({ userId: user.id, systemRole: 'STUDENT' })
    }

    return ok(
      {
        user,
        message:
          accountType === 'TEACHER'
            ? 'Đăng ký thành công! Tài khoản giáo viên đang chờ quản trị viên duyệt.'
            : 'Đăng ký thành công! Bạn đã có thể đăng nhập.',
      },
      201
    )
  })
}
