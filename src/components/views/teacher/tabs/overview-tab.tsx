'use client'

import { StatCard, EmptyState, PageHeader } from '@/components/shared/ui-bits'
import { formatDate, formatDateTime, formatVND, formatVNDShort } from '@/lib/format'
import { AmountText, TypeBadge, CategoryLabel, RoleBadge } from '@/components/shared/badges'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gavel,
  Users,
  Activity,
  ReceiptText,
  TriangleAlert,
} from 'lucide-react'

interface DetailData {
  class: { id: string; name: string; schoolYear: string; description: string | null }
  access: string
  stats: {
    memberCount: number
    balance: number
    totalIncome: number
    totalExpense: number
    penaltyCollected: number
    violationTotal: number
    violationCount: number
  }
  recentTransactions: {
    id: string
    type: string
    category: string
    amount: number
    description: string
    createdAt: string
    student: { fullName: string } | null
  }[]
  recentViolations: {
    id: string
    amount: number
    createdAt: string
    note: string | null
    student: { fullName: string }
    violationType: { name: string }
  }[]
}

export function OverviewTab({
  classId,
  data,
}: {
  classId: string
  data: DetailData
}) {
  const { data: fresh, refetch } = useQuery<DetailData>({
    queryKey: ['class-detail-fresh', classId],
    queryFn: () => apiFetch(`/api/classes/${classId}`),
    initialData: data,
  })

  const s = fresh.stats

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Tổng quỹ (Số dư)" value={formatVNDShort(s.balance)} icon={Wallet} tone="primary" />
        <StatCard label="Tổng thu" value={formatVNDShort(s.totalIncome)} icon={ArrowDownToLine} tone="income" />
        <StatCard
          label="Tiền phạt đã thu"
          value={formatVNDShort(s.penaltyCollected)}
          icon={Gavel}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Sĩ số lớp" value={`${s.memberCount} học sinh`} icon={Users} />
        <StatCard
          label="Tổng tiền vi phạm (chưa thu)"
          value={formatVNDShort(s.violationTotal)}
          sub={`${s.violationCount} lượt vi phạm`}
          icon={TriangleAlert}
          tone="warning"
        />
        <StatCard
          label="Giao dịch quỹ"
          value={`${fresh.recentTransactions.length > 0 ? 'Đang hoạt động' : 'Chưa có'}`}
          icon={ReceiptText}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <PageHeader title="Giao dịch gần đây" />
          {fresh.recentTransactions.length === 0 ? (
            <EmptyState icon={Activity} title="Chưa có giao dịch nào" description="Khoản thu/chi sẽ hiển thị tại đây." />
          ) : (
            <div className="space-y-2">
              {fresh.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-white px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={tx.type} />
                      <CategoryLabel category={tx.category} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {tx.student ? `${tx.student.fullName} — ` : ''}
                      {tx.description} · {formatDate(tx.createdAt)}
                    </p>
                  </div>
                  <AmountText type={tx.type} amount={tx.amount} className="text-sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <PageHeader title="Vi phạm gần đây" />
          {fresh.recentViolations.length === 0 ? (
            <EmptyState icon={TriangleAlert} title="Chưa có vi phạm nào" description="Vi phạm được ghi nhận sẽ hiển thị tại đây." />
          ) : (
            <div className="space-y-2">
              {fresh.recentViolations.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-white px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{v.student.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {v.violationType.name} · {formatDateTime(v.createdAt)}
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
      </div>
    </div>
  )
}
