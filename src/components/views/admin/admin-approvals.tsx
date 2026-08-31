'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { RoleBadge } from '@/components/shared/badges'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { useQuery as useReactQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserCheck, CheckCircle2, XCircle, Inbox } from 'lucide-react'

interface PendingUser {
  id: string
  fullName: string
  email: string
  systemRole: string
  status: string
  createdAt: string
}

export function AdminApprovals() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery<{ users: PendingUser[] }>({
    queryKey: ['pending-teachers'],
    queryFn: () => apiFetch('/api/admin/users?role=TEACHER&status=PENDING&pageSize=100'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/users/${id}`, { method: 'PATCH', json: { action: 'APPROVE' } }),
    onSuccess: () => {
      toast.success('Đã duyệt giáo viên.')
      qc.invalidateQueries({ queryKey: ['pending-teachers'] })
      qc.invalidateQueries({ queryKey: ['pending-teachers-count'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/users/${id}`, { method: 'PATCH', json: { action: 'REJECT' } }),
    onSuccess: () => {
      toast.success('Đã từ chối yêu cầu đăng ký.')
      qc.invalidateQueries({ queryKey: ['pending-teachers'] })
      qc.invalidateQueries({ queryKey: ['pending-teachers-count'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader
        title="Giáo viên chờ duyệt"
        description="Tài khoản giáo viên chỉ được kích hoạt sau khi bạn duyệt."
      />

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <EmptyState icon={UserCheck} title="Không thể tải dữ liệu" description={(error as Error).message} />
      ) : (data?.users ?? []).length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Không có yêu cầu nào đang chờ"
          description="Mọi tài khoản giáo viên đăng ký sẽ xuất hiện tại đây để bạn duyệt."
        />
      ) : (
        <div className="space-y-2.5">
          {data!.users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{u.fullName}</p>
                  <RoleBadge role={u.systemRole} />
                </div>
                <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                <p className="text-xs text-muted-foreground">Đăng ký: {formatDateTime(u.createdAt)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(u.id)}
                  disabled={approveMutation.isPending}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" /> Duyệt
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-red-600 hover:bg-red-50"
                  onClick={() => rejectMutation.mutate(u.id)}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="h-4 w-4" /> Từ chối
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
