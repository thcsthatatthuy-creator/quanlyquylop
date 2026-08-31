import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassManager } from '@/lib/permissions'
import { handle, ok, fail } from '@/lib/api'
import { logActivity } from '@/lib/audit'
import { CLASS_ROLE_LABEL } from '@/lib/format'

/**
 * PATCH /api/classes/[id]/students/[userId]
 * Đổi class role (Học sinh ↔ Thủ quỹ) — chỉ giáo viên sở hữu / admin.
 * Thủ quỹ KHÔNG được đổi role người khác.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  return handle(async () => {
    const { id, userId } = await params
    const ctx = await requireClassManager(id)

    const member = await db.classMember.findFirst({
      where: { userId, classId: id },
      include: { user: { select: { id: true, fullName: true } } },
    })
    if (!member) return fail(404, 'Không tìm thấy thành viên trong lớp.')

    const body = await req.json()
    if (body.classRole === undefined) return fail(400, 'Thiếu dữ liệu classRole.')
    const newRole = body.classRole === 'TREASURER' ? 'TREASURER' : 'STUDENT'

    if (newRole === member.classRole) {
      return fail(400, 'Vai trò này đã được gán trước đó.')
    }

    // Một lớp chỉ nên có một thủ quỹ duy nhất tại một thời điểm
    if (newRole === 'TREASURER') {
      await db.classMember.updateMany({
        where: { classId: id, classRole: 'TREASURER', id: { not: member.id } },
        data: { classRole: 'STUDENT' },
      })
    }

    const updated = await db.classMember.update({
      where: { id: member.id },
      data: { classRole: newRole },
    })

    await logActivity({
      userId: ctx.user.id,
      action: 'ROLE_CHANGED',
      targetType: 'CLASS_MEMBER',
      targetId: member.id,
      classId: id,
      metadata: {
        studentName: member.user.fullName,
        from: CLASS_ROLE_LABEL[member.classRole],
        to: CLASS_ROLE_LABEL[newRole],
        className: ctx.class.name,
      },
    })

    return ok({ membership: updated })
  })
}

/**
 * DELETE /api/classes/[id]/students/[userId]
 * Xóa học sinh khỏi lớp — chỉ giáo viên sở hữu / admin.
 * User account vẫn giữ lại (có thể thêm vào lớp khác sau), lịch sử vi phạm thuộc lớp cũ vẫn còn.
 */
export async function DELETE(
  _req: NextRequest,
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

    await db.classMember.delete({ where: { id: member.id } })

    await logActivity({
      userId: ctx.user.id,
      action: 'STUDENT_REMOVED',
      targetType: 'CLASS_MEMBER',
      targetId: member.id,
      classId: id,
      metadata: {
        studentName: member.user.fullName,
        studentEmail: member.user.email,
        className: ctx.class.name,
      },
    })

    return ok({ success: true })
  })
}
