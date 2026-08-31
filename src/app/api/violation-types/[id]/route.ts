import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassManager } from '@/lib/permissions'
import { handle, ok, fail, requireString, parseAmount, optionalString } from '@/lib/api'
import { logActivity } from '@/lib/audit'

/**
 * PATCH /api/violation-types/[id]
 * Sửa tên / số tiền mặc định / bật-tắt kích hoạt — giáo viên sở hữu / admin.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const type = await db.violationType.findUnique({ where: { id } })
    if (!type) return fail(404, 'Không tìm thấy loại vi phạm.')

    const ctx = await requireClassManager(type.classId)
    const body = await req.json()

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = requireString(body.name, 'Tên loại vi phạm', 100)
    if (body.amount !== undefined) data.amount = parseAmount(body.amount)
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.description !== undefined) data.description = optionalString(body.description, 500)

    if (data.name && data.name !== type.name) {
      const dup = await db.violationType.findFirst({
        where: { classId: type.classId, name: data.name as string },
      })
      if (dup) return fail(409, 'Loại vi phạm này đã tồn tại trong lớp.')
    }

    const updated = await db.violationType.update({ where: { id }, data })

    await logActivity({
      userId: ctx.user.id,
      action: 'VIOLATION_TYPE_UPDATED',
      targetType: 'VIOLATION_TYPE',
      targetId: id,
      classId: type.classId,
      metadata: { name: updated.name, amount: updated.amount, active: updated.active },
    })

    return ok({ violationType: updated })
  })
}

/**
 * DELETE /api/violation-types/[id]
 * Nếu đã có vi phạm ghi nhận theo loại này thì chỉ cho VÔ HIỆU HÓA (bảo toàn lịch sử),
 * ngược lại xóa hẳn.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const type = await db.violationType.findUnique({ where: { id } })
    if (!type) return fail(404, 'Không tìm thấy loại vi phạm.')

    const ctx = await requireClassManager(type.classId)

    const usedCount = await db.violation.count({ where: { violationTypeId: id } })
    if (usedCount > 0) {
      await db.violationType.update({ where: { id }, data: { active: false } })
      await logActivity({
        userId: ctx.user.id,
        action: 'VIOLATION_TYPE_UPDATED',
        targetType: 'VIOLATION_TYPE',
        targetId: id,
        classId: type.classId,
        metadata: { deactivated: true, reason: 'Đã có vi phạm ghi nhận theo loại này', usedCount },
      })
      return ok({ deactivated: true, message: 'Loại vi phạm đã được vô hiệu hóa (đang có lịch sử vi phạm).' })
    }

    await db.violationType.delete({ where: { id } })
    await logActivity({
      userId: ctx.user.id,
      action: 'VIOLATION_TYPE_DELETED',
      targetType: 'VIOLATION_TYPE',
      targetId: id,
      classId: type.classId,
      metadata: { name: type.name },
    })
    return ok({ success: true })
  })
}
