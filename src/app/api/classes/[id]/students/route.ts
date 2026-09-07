import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassManager, requireClassAccess } from '@/lib/permissions'
import { hashPassword, isValidEmail } from '@/lib/auth'
import { handle, ok, fail, requireString } from '@/lib/api'
import { logActivity } from '@/lib/audit'

/**
 * GET /api/classes/[id]/students
 * Danh sách học sinh trong lớp — giáo viên sở hữu / thủ quỹ / admin.
 * Học sinh thường KHÔNG được xem danh sách đầy đủ (chỉ xem qua profile riêng).
 * Query: ?search=&role=STUDENT|TREASURER&status=ACTIVE|SUSPENDED&page=1&pageSize=20&sort=name|violation
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    await requireClassAccess(id, ['ADMIN', 'OWNER', 'TREASURER'])

    const url = new URL(req.url)
    const search = url.searchParams.get('search')?.trim() ?? ''
    const role = url.searchParams.get('role') ?? ''
    const status = url.searchParams.get('status') ?? ''
    const sort = url.searchParams.get('sort') ?? 'name'
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1)
    const pageSize = Math.min(100, Math.max(5, parseInt(url.searchParams.get('pageSize') ?? '50') || 50))

    const where: Record<string, unknown> = { classId: id }
    if (role === 'STUDENT' || role === 'TREASURER') where.classRole = role

    const memberships = await db.classMember.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, status: true, avatar: true, createdAt: true },
        },
      },
    })

    // Tính tổng vi phạm từng học sinh (backend tính)
    const violationAgg = await db.violation.groupBy({
      by: ['studentId'],
      where: { classId: id },
      _sum: { amount: true },
      _count: true,
    })
    const violationMap = new Map(violationAgg.map((v) => [v.studentId, v]))

    let rows = memberships.map((m) => {
      const v = violationMap.get(m.userId)
      return {
        membershipId: m.id,
        userId: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        avatar: m.user.avatar,
        status: m.user.status,
        classRole: m.classRole,
        joinedAt: m.createdAt,
        violationTotal: v?._sum.amount ?? 0,
        violationCount: v?._count ?? 0,
      }
    })

    if (status === 'ACTIVE' || status === 'SUSPENDED') {
      rows = rows.filter((r) => r.status === status)
    }
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) => r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      )
    }
    if (sort === 'violation') {
      rows.sort((a, b) => b.violationTotal - a.violationTotal)
    } else if (sort === 'violationAsc') {
      rows.sort((a, b) => a.violationTotal - b.violationTotal)
    } else {
      rows.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'))
    }

    const total = rows.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const paged = rows.slice((page - 1) * pageSize, page * pageSize)

    return ok({ students: paged, total, page, totalPages })
  })
}

/**
 * POST /api/classes/[id]/students
 * Giáo viên tạo tài khoản học sinh/thủ quỹ trong lớp → tạo đồng thời User + ClassMember.
 * Email phải UNIQUE toàn hệ thống.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassManager(id)

    const body = await req.json()
    const fullName = requireString(body.fullName, 'Họ và tên', 100)
    const email = requireString(body.email, 'Email', 200).toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''
    const classRole = body.classRole === 'TREASURER' ? 'TREASURER' : 'STUDENT'
    const gender = body.gender === 'female' ? 'Nữ' : (body.gender === 'male' ? 'Nam' : null)
    const { getRandomAvatar } = await import('@/lib/utils')
    const avatar = getRandomAvatar(gender)

    if (!isValidEmail(email)) return fail(400, 'Email không đúng định dạng.')
    if (password.length < 6) return fail(400, 'Mật khẩu phải có ít nhất 6 ký tự.')

    // Email unique toàn hệ thống — check chặt ở backend
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return fail(409, 'Email này đã được sử dụng. Vui lòng sử dụng email khác.')
    }

    const passwordHash = await hashPassword(password)
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          systemRole: 'STUDENT',
          status: 'ACTIVE',
          gender: gender,
          avatar: avatar,
        },
      })
      const member = await tx.classMember.create({
        data: { classId: id, userId: user.id, classRole },
      })
      return { user, member }
    })

    await logActivity({
      userId: ctx.user.id,
      action: 'STUDENT_ADDED',
      targetType: 'CLASS_MEMBER',
      targetId: result.user.id,
      classId: id,
      metadata: {
        fullName,
        email,
        classRole,
        className: ctx.class.name,
        method: 'CREATE_ACCOUNT',
      },
    })

    return ok(
      {
        student: {
          membershipId: result.member.id,
          userId: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          status: result.user.status,
          classRole: result.member.classRole,
          violationTotal: 0,
          violationCount: 0,
        },
      },
      201
    )
  })
}
