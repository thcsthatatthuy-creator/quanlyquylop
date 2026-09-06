import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassTreasurerLevel } from '@/lib/permissions'
import { handle, ok, fail } from '@/lib/api'
import { logActivity } from '@/lib/audit'
import { formatVND } from '@/lib/format'

/**
 * DELETE /api/violations/[id]
 * Chỉ giáo viên sở hữu lớp / admin được xóa vi phạm. Bắt buộc ghi audit log.
 * Thủ quỹ và học sinh KHÔNG được xóa.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const violation = await db.violation.findUnique({
      where: { id },
      include: {
        student: { select: { fullName: true } },
        violationType: { select: { name: true } },
      },
    })
    if (!violation) return fail(404, 'Không tìm thấy vi phạm.')

    const ctx = await requireClassTreasurerLevel(violation.classId)
    await db.violation.delete({ where: { id } })

    await logActivity({
      userId: ctx.user.id,
      action: 'VIOLATION_DELETED',
      targetType: 'VIOLATION',
      targetId: id,
      classId: violation.classId,
      metadata: {
        studentName: violation.student.fullName,
        typeName: violation.violationType.name,
        amount: formatVND(violation.amount),
      },
    })

    return ok({ success: true })
  })
}
