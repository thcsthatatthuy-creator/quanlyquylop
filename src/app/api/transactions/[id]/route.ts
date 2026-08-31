import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassManager } from '@/lib/permissions'
import { handle, ok, fail } from '@/lib/api'
import { logActivity } from '@/lib/audit'
import { formatVND, TX_CATEGORY_LABEL } from '@/lib/format'

/**
 * DELETE /api/transactions/[id]
 * Xóa giao dịch tài chính — CHỈ giáo viên sở hữu lớp / admin. Bắt buộc ghi audit log
 * (không được xóa giao dịch mà không lưu log).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const tx = await db.fundTransaction.findUnique({
      where: { id },
      include: {
        student: { select: { fullName: true } },
        creator: { select: { fullName: true } },
      },
    })
    if (!tx) return fail(404, 'Không tìm thấy giao dịch.')

    const ctx = await requireClassManager(tx.classId)
    await db.fundTransaction.delete({ where: { id } })

    await logActivity({
      userId: ctx.user.id,
      action: 'TRANSACTION_DELETED',
      targetType: 'FUND_TRANSACTION',
      targetId: id,
      classId: tx.classId,
      metadata: {
        type: tx.type === 'INCOME' ? 'Thu' : 'Chi',
        category: TX_CATEGORY_LABEL[tx.category] ?? tx.category,
        amount: formatVND(tx.amount),
        studentName: tx.student?.fullName ?? null,
        description: tx.description,
        originalCreator: tx.creator.fullName,
      },
    })

    return ok({ success: true })
  })
}
