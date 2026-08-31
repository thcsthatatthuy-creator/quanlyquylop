'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { PageHeader, StatCard, LoadingBlock, EmptyState } from '@/components/shared/ui-bits'
import { formatDateTime, formatVND, formatVNDShort } from '@/lib/format'
import { RoleBadge, StatusBadge } from '@/components/shared/badges'
import { Users, GraduationCap, School, Wallet, UserCheck, TriangleAlert, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface AdminStats {
  stats: {
    totalUsers: number
    totalTeachers: number
    totalStudents: number
    pendingTeachers: number
    totalClasses: number
    totalFundBalance: number
    violationTotal: number
    violationCount: number
  }
  recentUsers: {
    id: string
    fullName: string
    email: string
    systemRole: string
    status: string
    createdAt: string
  }[]
}

export function AdminDashboard() {
  const { data, isLoading, error } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => apiFetch('/api/admin/stats'),
  })

  if (isLoading) return <LoadingBlock />
  if (error) return <EmptyState icon={TriangleAlert} title="Không thể tải dữ liệu" description={(error as Error).message} />

  const s = data!.stats

  return (
    <div>
      <PageHeader title="Tổng quan hệ thống" description="Thống kê toàn bộ người dùng, lớp học và quỹ." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Tổng người dùng" value={String(s.totalUsers)} icon={Users} tone="primary" />
        <StatCard
          label="Giáo viên"
          value={String(s.totalTeachers)}
          sub={s.pendingTeachers > 0 ? `${s.pendingTeachers} đang chờ duyệt` : undefined}
          icon={GraduationCap}
          tone={s.pendingTeachers > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Học sinh" value={String(s.totalStudents)} icon={UserCheck} />
        <StatCard label="Tổng lớp học" value={String(s.totalClasses)} icon={School} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Tổng tiền quỹ (mọi lớp)" value={formatVNDShort(s.totalFundBalance)} icon={Wallet} tone="income" />
        <StatCard
          label="Tổng tiền vi phạm"
          value={formatVNDShort(s.violationTotal)}
          sub={`${s.violationCount} lượt`}
          icon={TriangleAlert}
          tone="warning"
        />
        <StatCard label="Hệ thống" value="Hoạt động" icon={ShieldCheck} tone="income" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Người dùng mới nhất</CardTitle>
          <CardDescription>6 tài khoản đăng ký gần đây</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data!.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RoleBadge role={u.systemRole} />
                  <StatusBadge status={u.status} />
                  <span className="hidden text-xs text-muted-foreground sm:inline">{formatDateTime(u.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
