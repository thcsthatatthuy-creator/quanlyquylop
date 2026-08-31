'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { PageHeader, EmptyState, LoadingBlock, StatCard } from '@/components/shared/ui-bits'
import { formatDateTime, formatVND, formatVNDShort } from '@/lib/format'
import { AmountText, CategoryLabel } from '@/components/shared/badges'
import { TriangleAlert, Wallet, ArrowDownToLine, Inbox } from 'lucide-react'

interface OverviewData {
  classInfo: { id: string; name: string } | null
  classFund: { balance: number; income: number; expense: number } | null
  myStats: { paidTotal: number }
}

export function MyFund() {
  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ['me-overview'],
    queryFn: () => apiFetch('/api/me/overview'),
  })
  const txQuery = useQuery<{
    transactions: {
      id: string
      amount: number
      category: string
      description: string
      createdAt: string
      creator: { fullName: string }
    }[]
    totalPaid: number
  }>({
    queryKey: ['me-transactions'],
    queryFn: () => apiFetch('/api/me/transactions'),
  })

  if (isLoading) return <LoadingBlock />
  if (error) return <EmptyState icon={TriangleAlert} title="Không thể tải dữ liệu" description={(error as Error).message} />

  const cls = data!.classInfo
  if (!cls) {
    return (
      <div>
        <PageHeader title="Quỹ lớp" />
        <EmptyState icon={Wallet} title="Chưa thuộc lớp học" description="Liên hệ giáo viên để được thêm vào lớp." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`Quỹ lớp ${cls.name}`} description="Thông tin quỹ được công khai cho cả lớp." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard
          label="Số dư quỹ lớp"
          value={formatVNDShort(data!.classFund?.balance ?? 0)}
          icon={Wallet}
          tone="income"
        />
        <StatCard
          label="Tổng tiền bạn đã nộp"
          value={formatVNDShort(data!.myStats.paidTotal)}
          icon={ArrowDownToLine}
          tone="primary"
        />
        <StatCard
          label="Tổng chi của lớp"
          value={formatVNDShort(data!.classFund?.expense ?? 0)}
          icon={Wallet}
        />
      </div>

      <PageHeader title="Các khoản tôi đã nộp" />
      {txQuery.isLoading ? (
        <LoadingBlock />
      ) : (txQuery.data?.transactions ?? []).length === 0 ? (
        <EmptyState icon={Inbox} title="Chưa nộp khoản nào" description="Khoản đóng quỹ/tiền phạt bạn đã nộp sẽ hiển thị tại đây." />
      ) : (
        <div className="space-y-2">
          {txQuery.data!.transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg border border-border bg-white px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  <CategoryLabel category={tx.category} /> — {tx.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(tx.createdAt)} · Xác nhận bởi {tx.creator.fullName}
                </p>
              </div>
              <AmountText type="INCOME" amount={tx.amount} className="text-sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
