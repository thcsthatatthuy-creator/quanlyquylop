import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassManager } from '@/lib/permissions'
import { hashPassword, isValidEmail } from '@/lib/auth'
import { handle, ok, fail } from '@/lib/api'
import { logActivity } from '@/lib/audit'

interface ImportRow {
  fullName: string
  email: string
  password: string
  classRole: string
}

/**
 * POST /api/classes/[id]/import-confirm
 * Import CÁC DÒNG HỢP LỆ đã được người dùng xác nhận sau preview.
 * Backend VALIDATE LẠI toàn bộ (không tin client), re-check email unique,
 * tạo User + ClassMember trong transaction. Ghi audit log.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassManager(id)

    const body = await req.json()
    const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) return fail(400, 'Không có dòng hợp lệ nào để import.')
    if (rows.length > 500) return fail(400, 'Số dòng vượt quá giới hạn 500.')

    // Re-validate ở backend
    const emails = rows.map((r) => (typeof r.email === 'string' ? r.email.trim().toLowerCase() : ''))
    const existing = await db.user.findMany({
      where: { email: { in: emails.filter(Boolean) } },
      select: { email: true },
    })
    const existingSet = new Set(existing.map((u) => u.email))

    const seen = new Set<string>()
    const validRows: { fullName: string; email: string; password: string; classRole: string }[] = []
    const skipped: { email: string; reason: string }[] = []

    for (const row of rows) {
      const fullName = typeof row.fullName === 'string' ? row.fullName.trim() : ''
      const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : ''
      const password = typeof row.password === 'string' ? row.password : ''
      const classRole = row.classRole === 'TREASURER' ? 'TREASURER' : 'STUDENT'

      if (!fullName || !email || !isValidEmail(email) || password.length < 6) {
        skipped.push({ email, reason: 'Dữ liệu không hợp lệ' })
        continue
      }
      if (seen.has(email) || existingSet.has(email)) {
        skipped.push({ email, reason: 'Email đã tồn tại' })
        continue
      }
      seen.add(email)
      existingSet.add(email)
      validRows.push({ fullName, email, password, classRole })
    }

    if (validRows.length === 0) {
      return fail(400, 'Không có dòng hợp lệ nào để import.')
    }

    let imported = 0
    await db.$transaction(async (tx) => {
      for (const row of validRows) {
        const passwordHash = await hashPassword(row.password)
        const user = await tx.user.create({
          data: {
            fullName: row.fullName,
            email: row.email,
            passwordHash,
            systemRole: 'STUDENT',
            status: 'ACTIVE',
          },
        })
        await tx.classMember.create({
          data: { classId: id, userId: user.id, classRole: row.classRole },
        })
        imported += 1
      }
    })

    await logActivity({
      userId: ctx.user.id,
      action: 'IMPORT_STUDENTS',
      targetType: 'CLASS',
      targetId: id,
      classId: id,
      metadata: {
        className: ctx.class.name,
        imported,
        skippedCount: skipped.length,
        emails: validRows.map((r) => r.email),
      },
    })

    return ok({
      imported,
      skipped,
      message: `Đã import ${imported} học sinh vào lớp ${ctx.class.name}.`,
    })
  })
}
