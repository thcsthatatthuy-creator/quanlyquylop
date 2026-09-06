'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { useAuth } from '@/components/providers'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { formatVND, formatDate } from '@/lib/format'
import { RoleBadge, StatusBadge } from '@/components/shared/badges'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { UserRound, TriangleAlert, BadgeCheck, Hourglass } from 'lucide-react'

interface OverviewData {
  profile: { fullName: string; email: string; avatar: string | null }
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
  classFund: { balance: number } | null
}

export function MyProfile() {
  const auth = useAuth()
  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ['me-overview'],
    queryFn: () => apiFetch('/api/me/overview'),
  })

  if (isLoading) return <LoadingBlock />
  if (error) return <EmptyState icon={TriangleAlert} title="Không thể tải hồ sơ" description={(error as Error).message} />

  const cls = data!.classInfo

  return (
    <div>
      <PageHeader title="Hồ sơ học sinh" description="Thông tin cá nhân và tình trạng vi phạm của bạn." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-800 overflow-hidden relative shadow-sm border border-slate-200">
                {data!.profile.avatar ? (
                  <img src={data!.profile.avatar} alt={data!.profile.fullName} className="h-full w-full object-cover" />
                ) : (
                  data!.profile.fullName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold">{data!.profile.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">{data!.profile.email}</p>
                <div className="mt-1.5 flex gap-2">
                  <RoleBadge role="STUDENT" />
                  <StatusBadge status="ACTIVE" />
                </div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lớp</span>
                <span className="font-medium">{cls?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Năm học</span>
                <span className="font-medium">{cls?.schoolYear ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giáo viên chủ nhiệm</span>
                <span className="font-medium">{cls?.teacherName ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vai trò trong lớp</span>
                <span className="font-medium">{cls?.myClassRoleLabel ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sĩ số</span>
                <span className="font-medium">{cls ? `${cls.memberCount} học sinh` : '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="mb-4 flex items-center gap-2 font-semibold">
              <TriangleAlert className="h-4.5 w-4.5 text-amber-600" /> Tình trạng vi phạm
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-red-50 px-3.5 py-3">
                <p className="text-xs font-medium text-red-700">Tổng tiền vi phạm</p>
                <p className="mt-0.5 text-lg font-bold text-red-800">
                  {formatVND(data!.myStats.violationTotal)}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 px-3.5 py-3">
                <p className="text-xs font-medium text-amber-700">Số lần vi phạm</p>
                <p className="mt-0.5 text-lg font-bold text-amber-800">{data!.myStats.violationCount}</p>
              </div>
              <div className="rounded-lg bg-blue-50 px-3.5 py-3">
                <p className="text-xs font-medium text-blue-700">Tổng tiền đã nộp</p>
                <p className="mt-0.5 text-lg font-bold text-blue-800">
                  {formatVND(data!.myStats.paidTotal)}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 px-3.5 py-3">
                <p className="text-xs font-medium text-orange-700">Còn phải nộp</p>
                <p className="mt-0.5 text-lg font-bold text-orange-800">
                  {formatVND(data!.myStats.remainingToPay)}
                </p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Số dư quỹ lớp</span>
              <span className="font-semibold text-blue-700">
                {formatVND(data!.classFund?.balance ?? 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
