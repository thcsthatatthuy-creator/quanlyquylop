import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            class: {
              include: {
                teacher: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản với email này.' }, { status: 404 })
    }

    if (user.systemRole === 'TEACHER' || user.systemRole === 'ADMIN') {
      return NextResponse.json({ error: 'Vui lòng liên hệ quản trị viên hệ thống để cấp lại mật khẩu giáo viên.' }, { status: 400 })
    }

    if (user.memberships.length === 0) {
      return NextResponse.json({ error: 'Tài khoản chưa được phân vào lớp nào, vui lòng liên hệ nhà trường.' }, { status: 400 })
    }

    // Lấy tên GVCN của lớp đầu tiên
    const teacherName = user.memberships[0].class.teacher.fullName

    return NextResponse.json({ 
      message: `Hãy liên hệ ${teacherName} để được cập lại mật khẩu !` 
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Lỗi server.' }, { status: 500 })
  }
}
