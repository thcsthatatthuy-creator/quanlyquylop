import { getSessionUser } from '@/lib/auth'
import { getMyClasses } from '@/lib/permissions'
import { handle, ok, fail } from '@/lib/api'

/**
 * GET /api/auth/me
 * Trả về user hiện tại + danh sách lớp liên quan + classRole.
 * Hệ thống tự xác định lớp của học sinh qua class_members (không cần nhập mã lớp).
 */
export async function GET() {
  return handle(async () => {
    const user = await getSessionUser()
    if (!user) return fail(401, 'Chưa đăng nhập.')

    const classes = await getMyClasses(user.id, user.systemRole)

    return ok({
      user,
      classes: classes.map((c: Record<string, unknown>) => ({
        id: c.id,
        name: c.name,
        schoolYear: c.schoolYear,
        description: c.description,
        teacherName: (c.teacher as { fullName?: string } | null)?.fullName ?? '',
        memberCount: (c._count as { members?: number } | null)?.members ?? 0,
        myClassRole: (c.myClassRole as string | undefined) ?? null,
      })),
    })
  })
}
