import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClassManager } from '@/lib/permissions'
import { isValidEmail } from '@/lib/auth'
import { handle, ok, fail } from '@/lib/api'

interface ImportRow {
  fullName: string
  email: string
  password: string
  role: string
}

/**
 * POST /api/classes/[id]/import-validate
 * Client parse file Excel → gửi mảng dòng (JSON) → backend validate từng dòng
 * và trả về kết quả kiểm tra để PREVIEW. KHÔNG import ở bước này.
 * Trả về: hợp lệ / email trùng trong file / email đã tồn tại hệ thống / thiếu dữ liệu...
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const ctx = await requireClassManager(id)

    const body = await req.json()
    const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) return fail(400, 'File không có dữ liệu.')
    if (rows.length > 500) return fail(400, 'Số dòng vượt quá giới hạn 500.')

    // Email đã tồn tại toàn hệ thống
    const emails = rows.map((r) => (typeof r.email === 'string' ? r.email.trim().toLowerCase() : ''))
    const existingUsers = await db.user.findMany({
      where: { email: { in: emails.filter(Boolean) } },
      select: { email: true },
    })
    const existingSet = new Set(existingUsers.map((u) => u.email))

    // Thành viên hiện tại của lớp (đánh dấu trùng trong lớp)
    const currentMembers = await db.classMember.findMany({
      where: { classId: id },
      include: { user: { select: { email: true } } },
    })
    const memberSet = new Set(currentMembers.map((m) => m.user.email))

    const seenInFile = new Set<string>()
    const results = rows.map((row, index) => {
      const errors: string[] = []
      const fullName = typeof row.fullName === 'string' ? row.fullName.trim() : ''
      const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : ''
      const password = typeof row.password === 'string' ? row.password.trim() : ''
      const roleRaw = typeof row.role === 'string' ? row.role.trim().toLowerCase() : ''
      const classRole = roleRaw === 'thủ quỹ' || roleRaw === 'thu quy' || roleRaw === 'TREASURER' ? 'TREASURER' : 'STUDENT'

      if (!fullName) errors.push('Thiếu họ tên')
      if (fullName.length > 100) errors.push('Họ tên quá dài')
      if (!email) errors.push('Thiếu email')
      else if (!isValidEmail(email)) errors.push('Email không đúng định dạng')
      if (!password) errors.push('Thiếu mật khẩu')
      else if (password.length < 6) errors.push('Mật khẩu phải ≥ 6 ký tự')

      if (email && !errors.includes('Thiếu email')) {
        if (seenInFile.has(email)) errors.push('Email bị trùng trong file')
        seenInFile.add(email)
        if (existingSet.has(email)) errors.push('Email đã tồn tại trong hệ thống')
        else if (memberSet.has(email)) errors.push('Học sinh đã có trong lớp này')
      }

      return {
        index,
        fullName,
        email,
        password,
        classRole,
        valid: errors.length === 0,
        errors,
      }
    })

    const validCount = results.filter((r) => r.valid).length
    const invalidCount = results.length - validCount

    return ok({
      preview: results,
      totalRows: rows.length,
      validCount,
      invalidCount,
      className: ctx.class.name,
    })
  })
}
