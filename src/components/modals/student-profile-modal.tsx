'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiFetch } from '@/lib/client'
import { formatVND, formatDate, formatDateTime } from '@/lib/format'
import { RoleBadge, StatusBadge } from '@/components/shared/badges'
import { LoadingBlock } from '@/components/shared/ui-bits'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, Inbox } from 'lucide-react'

interface ProfileData {
  student: {
    membershipId: string
    userId: string
    fullName: string
    email: string
    status: string
    classRole: string
    violationTotal: number
    violationCount: number
    joinedAt: string
  }
  violations: {
    id: string
    amount: number
    note: string | null
    createdAt: string
    violationType: { name: string }
  }[]
}

export function StudentProfileModal({
  classId,
  target,
  onClose,
}: {
  classId: string
  target: { membershipId: string; userId: string; fullName: string } | null
  onClose: () => void
}) {
  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['student-profile', classId, target?.userId],
    queryFn: () =>
      apiFetch(`/api/classes/${classId}/students/${target!.userId}/profile`),
    enabled: !!target && !!classId,
  })

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Hồ sơ học sinh</DialogTitle>
          <DialogDescription>Thông tin vi phạm và tình trạng đóng góp của học sinh.</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <LoadingBlock />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold leading-tight">{data.student.fullName}</p>
                  <p className="text-sm text-muted-foreground">{data.student.email}</p>
                </div>
                <RoleBadge role={data.student.classRole} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-red-50 px-3 py-2">
                  <p className="text-[11px] font-medium text-red-700">Tổng vi phạm</p>
                  <p className="text-base font-bold text-red-800">
                    {formatVND(data.student.violationTotal)}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-2">
                  <p className="text-[11px] font-medium text-amber-700">Số lần vi phạm</p>
                  <p className="text-base font-bold text-amber-800">{data.student.violationCount}</p>
                </div>
                <div className="rounded-lg bg-blue-50 px-3 py-2">
                  <p className="text-[11px] font-medium text-blue-700">Tổng tiền đã nộp</p>
                  <p className="text-base font-bold text-blue-800">
                    {formatVND(data.student.paidTotal ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-orange-50 px-3 py-2">
                  <p className="text-[11px] font-medium text-orange-700">Tiền còn phải nộp</p>
                  <p className="text-base font-bold text-orange-800">
                    {formatVND(
                      Math.max(0, data.student.violationTotal - (data.student.paidTotal ?? 0))
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={data.student.status} />
                <span>Tham gia lớp: {formatDate(data.student.joinedAt)}</span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold">Lịch sử vi phạm</p>
              </div>
              {data.violations.length === 0 ? (
                <div className="flex flex-col items-center rounded-lg border border-dashed py-6 text-muted-foreground">
                  <Inbox className="h-5 w-5" />
                  <p className="mt-1 text-sm">Chưa có vi phạm nào</p>
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {data.violations.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{v.violationType.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(v.createdAt)}
                          {v.note ? ` — ${v.note}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-red-700">
                        −{new Intl.NumberFormat('vi-VN').format(v.amount)}đ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Separator />
            <p className="text-center text-xs text-muted-foreground">
              Vi phạm chỉ trở thành tiền quỹ khi thủ quỹ ghi nhận đã thu.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
