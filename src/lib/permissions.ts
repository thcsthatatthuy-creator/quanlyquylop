import 'server-only'
import { db } from '@/lib/db'
import { getSessionUser, type SessionUser } from '@/lib/auth'

/**
 * Cấp quyền truy cập hiệu lực của user trên 1 lớp cụ thể.
 * Thứ bậc: ADMIN > OWNER (giáo viên chủ nhiệm) > TREASURER > STUDENT
 */
export type ClassAccessLevel = 'ADMIN' | 'OWNER' | 'TREASURER' | 'STUDENT'

export interface ClassAccess {
  access: ClassAccessLevel
  user: SessionUser
  class: {
    id: string
    name: string
    schoolYear: string
    description: string | null
    teacherId: string
  }
  membershipId: string | null
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new ApiError(401, 'Chưa đăng nhập hoặc phiên đã hết hạn.')
  return user
}

export async function requireRole(...roles: string[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.systemRole)) {
    throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.')
  }
  return user
}

/**
 * Kiểm tra quyền truy cập lớp ở backend — KHÔNG tin vào frontend.
 */
export async function requireClassAccess(
  classId: string,
  minLevels: ClassAccessLevel[] = ['ADMIN', 'OWNER', 'TREASURER', 'STUDENT']
): Promise<ClassAccess> {
  const user = await requireUser()

  const cls = await db.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      schoolYear: true,
      description: true,
      teacherId: true,
    },
  })
  if (!cls) throw new ApiError(404, 'Không tìm thấy lớp học.')

  // Admin: toàn quyền
  if (user.systemRole === 'ADMIN') {
    const access: ClassAccess = { access: 'ADMIN', user, class: cls, membershipId: null }
    if (minLevels.includes('ADMIN')) return access
    throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.')
  }

  // Giáo viên sở hữu lớp
  if (user.systemRole === 'TEACHER' && cls.teacherId === user.id) {
    const access: ClassAccess = { access: 'OWNER', user, class: cls, membershipId: null }
    if (minLevels.includes('OWNER')) return access
    throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.')
  }

  // Thành viên lớp (thủ quỹ / học sinh)
  if (user.systemRole === 'STUDENT') {
    const membership = await db.classMember.findUnique({
      where: { classId_userId: { classId, userId: user.id } },
    })
    if (membership) {
      const level: ClassAccessLevel =
        membership.classRole === 'TREASURER' ? 'TREASURER' : 'STUDENT'
      if (minLevels.includes(level)) {
        return { access: level, user, class: cls, membershipId: membership.id }
      }
      throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.')
    }
  }

  // Giáo viên khác không được can thiệp lớp không thuộc quyền
  throw new ApiError(403, 'Bạn không có quyền truy cập lớp học này.')
}

/**
 * Giáo viên phải sở hữu lớp (hoặc admin) mới được quản lý học sinh / danh mục.
 */
export async function requireClassManager(classId: string): Promise<ClassAccess> {
  return requireClassAccess(classId, ['ADMIN', 'OWNER'])
}

/**
 * Giáo viên sở hữu / thủ quỹ / admin mới được ghi nhận vi phạm, thu chi.
 */
export async function requireClassTreasurerLevel(classId: string): Promise<ClassAccess> {
  return requireClassAccess(classId, ['ADMIN', 'OWNER', 'TREASURER'])
}

/**
 * Lấy danh sách lớp mà user hiện tại liên quan (dùng cho /api/auth/me).
 */
export async function getMyClasses(userId: string, systemRole: string) {
  if (systemRole === 'ADMIN') {
    return db.class.findMany({
      orderBy: { createdAt: 'desc' },
      include: { teacher: { select: { fullName: true } }, _count: { select: { members: true } } },
    })
  }
  if (systemRole === 'TEACHER') {
    return db.class.findMany({
      where: { teacherId: userId },
      orderBy: { createdAt: 'desc' },
      include: { teacher: { select: { fullName: true } }, _count: { select: { members: true } } },
    })
  }
  // Học sinh: các lớp mình đang là thành viên
  const memberships = await db.classMember.findMany({
    where: { userId },
    include: {
      class: {
        include: { teacher: { select: { fullName: true } } },
      },
    },
  })
  return memberships.map((m) => ({
    ...m.class,
    _count: { members: 0 },
    myClassRole: m.classRole,
    membershipId: m.id,
  }))
}
