'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { useAuth } from '@/components/providers'
import { StatCard, PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { formatDate, formatVND, formatVNDShort } from '@/lib/format'
import { RoleBadge } from '@/components/shared/badges'
import { TriangleAlert, Hash, Wallet, BadgeCheck, Hourglass } from 'lucide-react'

interface OverviewData {
  profile: { fullName: string; email: string }
  classInfo: {
    id: string
    name: string
    schoolYear: string
    teacherName: string
    myClassRoleLabel: string
    memberCount: number
  } | null
  myStats: {
    violationTotal: number
    violationCount: number
    paidTotal: number
    remainingToPay: number
  }
  classFund: { balance: number; income: number; expense: number } | null
  recentViolations: {
    id: string
    amount: number
    note: string | null
    createdAt: string
    violationType: { name: string }
  }[]
}

export function StudentDashboard({ onOpenClass }: { onOpenClass?: () => void }) {
  const auth = useAuth()
  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ['me-overview'],
    queryFn: () => apiFetch('/api/me/overview'),
  })

  if (isLoading) return <LoadingBlock />
  if (error) return <EmptyState icon={TriangleAlert} title="Không thể tải dữ liệu" description={(error as Error).message} />

  const cls = data!.classInfo
  const isTreasurer = cls && cls.myClassRoleLabel === 'Thủ quỹ'

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${data!.profile.fullName}`}
        description={
          cls
            ? `${cls.name} · Năm học ${cls.schoolYear} · GVCN: ${cls.teacherName}`
            : 'Bạn chưa thuộc lớp nào — hãy liên hệ giáo viên để được thêm vào lớp.'
        }
        actions={cls ? <RoleBadge role={cls.myClassRoleLabel === 'Thủ quỹ' ? 'TREASURER' : 'STUDENT'} /> : undefined}
      />

      {!cls ? (
        <EmptyState
          icon={Wallet}
          title="Chưa thuộc lớp học"
          description="Tài khoản của bạn đã hoạt động nhưng chưa được thêm vào lớp nào. Hãy liên hệ giáo viên chủ nhiệm."
        />
      ) : (
        <>
          {isTreasurer && onOpenClass && (
            <button
              onClick={onOpenClass}
              className="mb-4 flex w-full items-center justify-between rounded-xl border border-amber-300 bg-amber-50/70 px-4 py-3 text-left transition-colors hover:bg-amber-100/70"
            >
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Bạn là thủ quỹ lớp {cls.name}
                </p>
                <p className="text-xs text-amber-800">
                  Vào khu quản lý để ghi nhận vi phạm, thu/chi quỹ và xem báo cáo.
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white">
                Mở quản lý
              </span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Tổng tiền vi phạm"
              value={formatVNDShort(data!.myStats.violationTotal)}
              icon={TriangleAlert}
              tone="expense"
            />
            <StatCard
              label="Số lần vi phạm"
              value={String(data!.myStats.violationCount)}
              icon={Hash}
              tone="warning"
            />
            <StatCard
              label="Số dư quỹ lớp"
              value={formatVNDShort(data!.classFund?.balance ?? 0)}
              icon={Wallet}
              tone="income"
            />
            <StatCard
              label="Còn phải nộp"
              value={formatVNDShort(data!.myStats.remainingToPay)}
              icon={Hourglass}
              tone={data!.myStats.remainingToPay > 0 ? 'expense' : 'income'}
            />
          </div>

          {data!.myStats.paidTotal > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
              <BadgeCheck className="h-5 w-5 shrink-0" />
              Bạn đã nộp tổng cộng <b>{formatVND(data!.myStats.paidTotal)}</b> vào quỹ lớp (đóng quỹ +
              tiền phạt).
            </div>
          )}

          <div className="mt-6">
            <PageHeader title="Vi phạm gần đây" />
            {data!.recentViolations.length === 0 ? (
              <EmptyState
                icon={BadgeCheck}
                title="Bạn chưa có vi phạm nào"
                description="Hãy tiếp tục phát huy nhé!"
              />
            ) : (
              <div className="space-y-2">
                {data!.recentViolations.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-white px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{v.violationType.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(v.createdAt)}
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
        </>
      )}
    </div>
  )
}
