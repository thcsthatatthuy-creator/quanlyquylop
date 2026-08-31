'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { LoadingBlock, EmptyState } from '@/components/shared/ui-bits'
import { MonthlyFlowChart, CategoryDonut, ViolationBarChart } from '@/components/shared/charts'
import { formatVND } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart3, PieChart, TrendingUp } from 'lucide-react'

interface StatsData {
  stats: {
    balance: number
    totalIncome: number
    totalExpense: number
    penaltyCollected: number
    violationTotal: number
    violationCount: number
  }
  monthly: { month: string; thu: number; chi: number; phat: number }[]
  expenseByCategory: { category: string; amount: number }[]
  violationByType: { name: string; count: number; amount: number }[]
}

export function ReportsTab({ classId, isManager }: { classId: string; isManager: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<StatsData>({
    queryKey: ['class-stats-full', classId],
    queryFn: () => apiFetch(`/api/classes/${classId}/stats`),
    enabled: !!classId,
  })

  if (isLoading) return <LoadingBlock />
  if (error || !data) {
    return <EmptyState icon={BarChart3} title="Không thể tải báo cáo" description={(error as Error)?.message} />
  }

  const hasTx = data.monthly.some((m) => m.thu > 0 || m.chi > 0 || m.phat > 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-700" /> Dòng tiền 6 tháng
            </CardTitle>
            <CardDescription>Tuần tự thu — chi — tiền phạt theo tháng</CardDescription>
          </CardHeader>
          <CardContent>
            {hasTx ? (
              <MonthlyFlowChart data={data.monthly} />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                Chưa có dữ liệu giao dịch
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4.5 w-4.5 text-emerald-700" /> Cơ cấu chi tiêu
            </CardTitle>
            <CardDescription>Tỉ trọng các danh mục chi</CardDescription>
          </CardHeader>
          <CardContent>
            {data.expenseByCategory.length > 0 ? (
              <CategoryDonut data={data.expenseByCategory} />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                Chưa có khoản chi nào
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4.5 w-4.5 text-emerald-700" /> Thống kê vi phạm theo loại
          </CardTitle>
          <CardDescription>Số lần vi phạm của cả lớp theo từng danh mục</CardDescription>
        </CardHeader>
        <CardContent>
          {data.violationByType.length > 0 ? (
            <ViolationBarChart
              data={data.violationByType.map((v) => ({ name: v.name, count: v.count }))}
            />
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              Chưa có vi phạm nào
            </div>
          )}
        </CardContent>
      </Card>

      {data.violationByType.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chi tiết tiền vi phạm theo loại</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {data.violationByType.map((v) => (
                <div
                  key={v.name}
                  className="flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.count} lần</p>
                  </div>
                  <span className="text-sm font-semibold text-red-700 tabular-nums">
                    {formatVND(v.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
