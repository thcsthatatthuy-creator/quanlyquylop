import 'server-only'
import { db } from '@/lib/db'

/**
 * Ghi audit log cho mọi thao tác quan trọng.
 * metadata: object bất kỳ, sẽ được serialize thành JSON string.
 * classId: nếu thao tác thuộc về một lớp cụ thể — phục vụ lọc log theo lớp.
 */
export async function logActivity(params: {
  userId: string
  action: string
  targetType: string
  targetId?: string | null
  classId?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await db.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        classId: params.classId ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
  } catch (e) {
    // Audit log lỗi không được làm sập nghiệp vụ chính, nhưng phải cảnh báo
    console.error('[AUDIT_LOG_ERROR]', e)
  }
}
