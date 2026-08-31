'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { formatDateTime, SYSTEM_ROLE_LABEL } from '@/lib/format'
import { RoleBadge } from '@/components/shared/badges'
import { Button } from '@/components/ui/button'
import { History, Inbox } from 'lucide-react'

interface LogRow {
  id: string
  user: { id: string; fullName: string; systemRole: string }
  actionLabel: string
  targetType: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

function describeLog(log: LogRow): string {
  const m = log.metadata ?? {}
  const parts: string[] = []
  if (m.studentName) parts.push(String(m.studentName))
  if (m.targetName) parts.push(String(m.targetName))
  if (m.typeName) parts.push(String(m.typeName))
  if (m.amount) parts.push(String(m.amount))
  if (m.from && m.to) parts.push(`${m.from} → ${m.to}`)
  if (m.className) parts.push(`Lớp ${m.className}`)
  if (m.teacherName) parts.push(`GV ${m.teacherName}`)
  if (m.imported) parts.push(`${m.imported} dòng`)
  if (m.email) parts.push(String(m.email))
  if (m.name && !m.className) parts.push(String(m.name))
  return parts.join(' · ')
}

export function AuditView({ variant, classId }: { variant: 'admin' | 'teacher'; classId?: string }) {
  const [page, setPage] = useState(1)
  const url = classId
    ? `/api/audit-logs?classId=${classId}&page=${page}&pageSize=30`
    : `/api/audit-logs?page=${page}&pageSize=30`

  const { data, isLoading, error } = useQuery<{ logs: LogRow[]; total: number; totalPages: number }>({
    queryKey: ['audit-logs', url],
    queryFn: () => apiFetch(url),
  })

  return (
    <div>
      <PageHeader
        title="Lịch sử hoạt động"
        description="Ai đã làm gì, với đối tượng nào và khi nào. Nhật ký chỉ đọc — không thể sửa hoặc xóa."
      />

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <EmptyState icon={History} title="Không thể tải dữ liệu" description={(error as Error).message} />
      ) : (data?.logs ?? []).length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Chưa có hoạt động nào"
          description="Các thao tác quan trọng (thêm vi phạm, thu/chi, đổi quyền...) sẽ được ghi lại tại đây."
        />
      ) : (
        <>
          <div className="space-y-2">
            {data!.logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {log.user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        <span className="font-semibold">{log.user.fullName}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          ({SYSTEM_ROLE_LABEL[log.user.systemRole] ?? log.user.systemRole})
                        </span>
                        <span className="text-foreground"> — {log.actionLabel}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{describeLog(log)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RoleBadge role={log.user.systemRole} />
                    <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Trang {page}/{data.totalPages} — {data.total} bản ghi
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Trước
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Sau
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
