'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { PageHeader, StatCard, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { formatDateTime, formatVND, formatVNDShort } from '@/lib/format'
import { AmountText, TypeBadge, CategoryLabel } from '@/components/shared/badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Gavel, BookOpenText, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TxRow {
  id: string
  type: string
  category: string
  amount: number
  description: string
  note: string | null
  createdAt: string
  student: { fullName: string } | null
  creator: { fullName: string; systemRole: string }
}

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'INCOME', label: 'Thu' },
  { key: 'EXPENSE', label: 'Chi' },
  { key: 'PENALTY_PAYMENT', label: 'Tiền phạt' },
]

export function FundTab({ classId, isManager }: { classId: string; isManager: boolean }) {
  const [filter, setFilter] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const statsQuery = useQuery<{
    stats: { balance: number; totalIncome: number; totalExpense: number; penaltyCollected: number }
  }>({
    queryKey: ['class-stats', classId],
    queryFn: () => apiFetch(`/api/classes/${classId}/stats`),
    select: (d) => ({ stats: d.stats }),
  })

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: '30' })
    if (filter !== 'all') p.set('type', filter)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    return p.toString()
  }, [filter, from, to, page])

  const ledgerQuery = useQuery<{ transactions: TxRow[]; total: number; totalPages: number }>({
    queryKey: ['class-ledger', classId, query],
    queryFn: () => apiFetch(`/api/classes/${classId}/transactions?${query}`),
    enabled: !!classId,
  })

  const s = statsQuery.data?.stats

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Số dư quỹ"
          value={s ? formatVND(s.balance) : '—'}
          icon={Wallet}
          tone="primary"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Tổng thu"
          value={s ? formatVND(s.totalIncome) : '—'}
          icon={ArrowDownToLine}
          tone="income"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Tổng chi"
          value={s ? formatVND(s.totalExpense) : '—'}
          icon={ArrowUpFromLine}
          tone="expense"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Tiền phạt đã thu"
          value={s ? formatVND(s.penaltyCollected) : '—'}
          icon={Gavel}
          tone="warning"
          loading={statsQuery.isLoading}
        />
      </div>

      <div>
        <PageHeader title="Sổ quỹ" description="Nhật ký mọi dòng tiền của lớp — do backend ghi nhận." />

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFilter(f.key)
                  setPage(1)
                }}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  filter === f.key
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-border bg-white text-slate-600 hover:border-emerald-300'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setPage(1)
              }}
              className="w-[140px]"
              aria-label="Từ ngày"
            />
            <span className="text-xs text-muted-foreground">đến</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setPage(1)
              }}
              className="w-[140px]"
              aria-label="Đến ngày"
            />
          </div>
        </div>

        {ledgerQuery.isLoading ? (
          <LoadingBlock />
        ) : (ledgerQuery.data?.transactions ?? []).length === 0 ? (
          <EmptyState
            icon={BookOpenText}
            title="Sổ quỹ trống"
            description="Các khoản thu/chi và tiền phạt đã nộp sẽ hiển thị tại đây."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            {ledgerQuery.data!.transactions.map((tx, idx) => (
              <div
                key={tx.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  idx > 0 && 'border-t border-border'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  )}
                >
                  {tx.type === 'INCOME' ? (
                    <ArrowDownToLine className="h-4 w-4" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {tx.student ? `${tx.student.fullName} — ` : ''}
                    {tx.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(tx.createdAt)} · {tx.creator.fullName}
                  </p>
                </div>
                <AmountText type={tx.type} amount={tx.amount} className="text-sm" />
              </div>
            ))}
            {ledgerQuery.data && ledgerQuery.data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Trang {page}/{ledgerQuery.data.totalPages} — {ledgerQuery.data.total} giao dịch
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= ledgerQuery.data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
