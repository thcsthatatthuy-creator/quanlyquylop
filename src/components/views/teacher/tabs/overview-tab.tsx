'use client'

import { StatCard, PageHeader } from '@/components/shared/ui-bits'
import { formatVNDShort } from '@/lib/format'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import {
  Wallet,
  ArrowDownToLine,
  Gavel,
  Users,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

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
  const { data: fresh } = useQuery<DetailData>({
    queryKey: ['class-detail-fresh', classId],
    queryFn: () => apiFetch(`/api/classes/${classId}`),
    initialData: data,
  })

  const s = fresh.stats
  const memberCount = s.memberCount
  const tienPhat = s.violationTotal
  const tienThu = Math.max(0, s.totalIncome - s.violationTotal)
  const tongQuy = tienPhat + tienThu

  const pieData = [
    { name: 'Tiền phạt', value: tienPhat },
    { name: 'Tiền thu', value: tienThu },
  ].filter(d => d.value > 0)

  const COLORS = ['#ef4444', '#10b981']

  const aggregatedViolations = fresh.recentViolations.reduce((acc, v) => {
    const name = v.student.fullName.split(' ').pop() || 'HS'
    acc[name] = (acc[name] || 0) + v.amount
    return acc
  }, {} as Record<string, number>)

  const barData = Object.entries(aggregatedViolations)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Sĩ số" value={`${memberCount} HS`} icon={Users} />
        <StatCard label="Tiền phạt" value={formatVNDShort(tienPhat)} icon={Gavel} tone="warning" />
        <StatCard label="Tiền thu" value={formatVNDShort(tienThu)} icon={ArrowDownToLine} tone="income" />
        <StatCard label="Tổng quỹ" value={formatVNDShort(tongQuy)} icon={Wallet} tone="primary" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <PageHeader title="Cơ cấu Quỹ" />
          <div className="mt-4 h-64 w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ'} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <PageHeader title="Top vi phạm gần đây" />
          <div className="mt-4 h-64 w-full">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => formatVNDShort(value)}
                  />
                  <Tooltip 
                    formatter={(value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ'} 
                    cursor={{ fill: 'var(--muted)' }}
                  />
                  <Bar dataKey="amount" name="Tiền phạt" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có vi phạm nào
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
