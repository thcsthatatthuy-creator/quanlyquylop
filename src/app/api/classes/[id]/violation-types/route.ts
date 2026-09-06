import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassTreasurerLevel, requireClassManager } from '@/lib/permissions'
import { handle, ok, fail, requireString, parseAmount } from '@/lib/api'
import { logActivity } from '@/lib/audit'
import { generateViolationIcon } from '@/lib/hf'

/**
 * GET /api/classes/[id]/violation-types
 * Danh mục vi phạm của lớp — teacher/treasurer/admin (dùng khi thêm vi phạm).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    await requireClassTreasurerLevel(id)

    const types = await db.violationType.findMany({
      where: { classId: id },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { violations: true } } },
    })
    return ok({ violationTypes: types })
  })
}

/**
 * POST /api/classes/[id]/violation-types
 * Giáo viên thêm loại vi phạm với số tiền mặc định.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassManager(id)

    const body = await req.json()
    const name = requireString(body.name, 'Tên loại vi phạm', 100)
    const amount = parseAmount(body.amount)

    let icon = body.icon ? requireString(body.icon, 'Biểu tượng', 1000) : null
    
    // Nếu không truyền icon, tự động tạo bằng Hugging Face AI
    if (!icon) {
      try {
        icon = await generateViolationIcon(name)
      } catch (err) {
        console.error('Lỗi khi tạo icon bằng Hugging Face:', err)
        // Fallback or leave null if it fails
      }
    }

    const dup = await db.violationType.findFirst({ where: { classId: id, name } })
    if (dup) return fail(409, 'Loại vi phạm này đã tồn tại trong lớp.')

    const type = await db.violationType.create({
      data: { classId: id, name, amount, icon, active: true },
    })

    await logActivity({
      userId: ctx.user.id,
      action: 'VIOLATION_TYPE_CREATED',
      targetType: 'VIOLATION_TYPE',
      targetId: type.id,
      classId: id,
      metadata: { name, amount, icon, className: ctx.class.name },
    })

    return ok({ violationType: type }, 201)
  })
}
