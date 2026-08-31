import { NextResponse } from 'next/server'
import { ApiError } from '@/lib/permissions'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Bọc mọi handler API: bắt ApiError (đã set status/message) và lỗi không lường trước.
 * Đảm bảo không rò rỉ stack trace ra frontend.
 */
export function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  return fn().catch((e) => {
    if (e instanceof ApiError) {
      return fail(e.status, e.message)
    }
    console.error('[API_ERROR]', e)
    return fail(500, 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.')
  })
}

/** Validate số tiền: số nguyên dương */
export function parseAmount(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new ApiError(400, 'Số tiền không hợp lệ. Phải là số nguyên dương.')
  }
  if (n > 10_000_000_000) {
    throw new ApiError(400, 'Số tiền quá lớn.')
  }
  return n
}

export function requireString(value: unknown, field: string, maxLen = 200): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, `${field} không được để trống.`)
  }
  const v = value.trim()
  if (v.length > maxLen) {
    throw new ApiError(400, `${field} không được vượt quá ${maxLen} ký tự.`)
  }
  return v
}

export function optionalString(value: unknown, maxLen = 500): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw new ApiError(400, 'Dữ liệu không hợp lệ.')
  const v = value.trim()
  if (v.length > maxLen) throw new ApiError(400, `Nội dung không được vượt quá ${maxLen} ký tự.`)
  return v || null
}
