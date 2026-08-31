'use client'

// Client-side helpers: fetch API + hash router (SPA chạy trên route /)

export class ApiClientError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...rest } = options ?? {}
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiClientError(res.status, (data as { error?: string }).error || 'Đã xảy ra lỗi.')
  }
  return data as T
}

// ---------- Hash router ----------
export function currentPath(): string {
  if (typeof window === 'undefined') return '/'
  const h = window.location.hash.replace(/^#/, '')
  return h || '/'
}

export function navigate(path: string) {
  window.location.hash = path
}
