import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/permissions'
import { handle, ok, fail } from '@/lib/api'
import { hashPassword } from '@/lib/auth'

/**
 * GET /api/admin/users — danh sách toàn bộ người dùng (admin)
 * Query: ?search=&role=TEACHER|STUDENT|ADMIN&status=ACTIVE|PENDING|SUSPENDED&page=&pageSize=
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireRole('ADMIN')

    const url = new URL(req.url)
    const search = url.searchParams.get('search')?.trim().toLowerCase() ?? ''
    const role = url.searchParams.get('role') ?? ''
    const status = url.searchParams.get('status') ?? ''
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1)
    const pageSize = Math.min(100, Math.max(5, parseInt(url.searchParams.get('pageSize') ?? '20') || 20))

    const where: Record<string, unknown> = {}
    if (role) where.systemRole = role
    if (status) where.status = status

    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          systemRole: true,
          status: true,
          createdAt: true,
        },
      }),
    ])

    // Lớp học liên quan của từng user
    const classMap = new Map<string, string[]>()
    const memberships = await db.classMember.findMany({
      include: { class: { select: { name: true } } },
    })
    for (const m of memberships) {
      const arr = classMap.get(m.userId) ?? []
      arr.push(m.class.name)
      classMap.set(m.userId, arr)
    }
    const taught = await db.class.findMany({
      select: { teacherId: true, name: true },
    })
    for (const c of taught) {
      const arr = classMap.get(c.teacherId) ?? []
      arr.push(`${c.name} (CN)`)
      classMap.set(c.teacherId, arr)
    }

    let rows = users.map((u) => ({ ...u, classNames: classMap.get(u.id) ?? [] }))
    if (search) {
      rows = rows.filter(
        (u) => u.fullName.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
      )
    }

    const totalFiltered = rows.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
    const paged = rows.slice((page - 1) * pageSize, page * pageSize)

    return ok({ users: paged, total: totalFiltered, page, totalPages })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole('ADMIN')
    const body = await req.json()
    const { email, password, fullName, systemRole } = body

    if (!email || !password || !fullName || !systemRole) {
      return fail(400, 'Thiếu thông tin bắt buộc')
    }
    
    if (systemRole !== 'TEACHER' && systemRole !== 'STUDENT') {
      return fail(400, 'Vai trò không hợp lệ')
    }

    const exists = await db.user.findUnique({ where: { email } })
    if (exists) {
      return fail(400, 'Email đã được sử dụng')
    }

    const hashed = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        passwordHash: hashed,
        fullName,
        systemRole,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        systemRole: true,
        status: true,
        createdAt: true,
      },
    })

    return ok({ user })
  })
}
