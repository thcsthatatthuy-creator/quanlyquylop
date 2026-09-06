import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return new Response('Unauthorized', { status: 401 })
    const { id } = params
    
    // Check permission
    if (user.systemRole !== 'ADMIN') {
      const membership = await db.classMember.findUnique({
        where: { classId_userId: { classId: id, userId: user.id } },
      })
      if (!membership || !['OWNER', 'ADMIN', 'TREASURER'].includes(membership.role)) {
        return new Response('Forbidden', { status: 403 })
      }
    }

    // Fetch students
    const members = await db.classMember.findMany({
      where: { classId: id },
      include: { user: true },
      orderBy: { user: { fullName: 'asc' } },
    })

    let csv = '\uFEFF' // BOM for UTF-8 Excel compatibility
    csv += 'STT,Ho va ten,Email,Mat khau,Vai tro\n'

    members.forEach((m, i) => {
      const roleStr = m.role === 'STUDENT' ? 'Hoc sinh' : m.role === 'TREASURER' ? 'Thu quy' : 'Giao vien'
      // Passwords are hashed in DB, we cannot export them, so we just write "******"
      csv += `${i + 1},"${m.user.fullName}","${m.user.email}","****** (Da ma hoa)","${roleStr}"\n`
    })

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="danh_sach_lop_${id}.csv"`,
      },
    })
  } catch (err: any) {
    return new Response(err.message, { status: 500 })
  }
}
