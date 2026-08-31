'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { formatVND, formatDate } from '@/lib/format'
import { TriangleAlert, BadgeCheck } from 'lucide-react'

export function MyViolations() {
  const { data, isLoading, error } = useQuery<{
    violations: {
      id: string
      amount: number
      note: string | null
      createdAt: string
      violationType: { name: string }
      creator: { fullName: string }
    }[]
    totalAmount: number
    totalCount: number
  }>({
    queryKey: ['me-violations'],
    queryFn: () => apiFetch('/api/me/violations'),
  })

  if (isLoading) return <LoadingBlock />
  if (error)
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Không thể tải dữ liệu"
        description={(error as Error).message}
      />
    )

  return (
    <div>
      <PageHeader
        title="Vi phạm của tôi"
        description={`Tổng: ${formatVND(data!.totalAmount)} · ${data!.totalCount} lần vi phạm`}
      />
      {data!.violations.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="Bạn chưa có vi phạm nào"
          description="Tiếp tục giữ ý thức kỷ luật tốt nhé!"
        />
      ) : (
        <div className="space-y-2">
          {data!.violations.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-lg border border-border bg-white px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{v.violationType.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(v.createdAt)} · Ghi nhận bởi {v.creator.fullName}
                  {v.note ? ` — ${v.note}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-red-700 tabular-nums">
                −{new Intl.NumberFormat('vi-VN').format(v.amount)}đ
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
