'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { useAuth } from '@/components/providers'
import { PageHeader, StatCard, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { formatVNDShort } from '@/lib/format'
import { CreateClassModal, EditClassModal } from '@/components/modals/create-class-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { toast } from 'sonner'
import {
  Wallet,
  Users,
  School,
  ArrowUpRight,
  Plus,
  Settings2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ClassRow {
  id: string
  name: string
  schoolYear: string
  description: string | null
  teacher: { fullName: string }
  _count: { members: number; violations: number; transactions: number }
  balance: number
}

export function TeacherDashboard() {
  const auth = useAuth()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editClass, setEditClass] = useState<ClassRow | null>(null)
  const [deleteClass, setDeleteClass] = useState<ClassRow | null>(null)

  const { data, isLoading, error, refetch } = useQuery<{ classes: ClassRow[] }>({
    queryKey: ['classes'],
    queryFn: () => apiFetch('/api/classes'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/classes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xóa lớp học.')
      setDeleteClass(null)
      qc.invalidateQueries({ queryKey: ['classes'] })
      auth.refresh()
    },
    onError: (e) => toast.error(e.message),
  })

  const classes = data?.classes ?? []
  const totalMembers = classes.reduce((s, c) => s + c._count.members, 0)
  const totalBalance = classes.reduce((s, c) => s + c.balance, 0)

  return (
    <div>
      <PageHeader
        title="Tổng quan"
        description={`Xin chào, ${auth.user?.fullName} — quản lý các lớp bạn phụ trách`}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Tạo lớp
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Số lớp đang phụ trách" value={String(classes.length)} icon={School} tone="primary" loading={isLoading} />
        <StatCard label="Tổng học sinh" value={String(totalMembers)} icon={Users} loading={isLoading} />
        <StatCard label="Tổng số dư quỹ" value={formatVNDShort(totalBalance)} icon={Wallet} tone="income" loading={isLoading} />
        <StatCard
          label="Tổng số dư"
          sub="Cộng dồn mọi lớp"
          value={classes.some((c) => c.balance < 0) ? formatVNDShort(0) : formatVNDShort(totalBalance)}
          icon={classes.some((c) => c.balance < 0) ? TrendingDown : TrendingUp}
          loading={isLoading}
        />
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <EmptyState icon={School} title="Không thể tải danh sách lớp" description={(error as Error).message} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={School}
          title="Chưa có lớp học nào"
          description="Tạo lớp học đầu tiên để bắt đầu quản lý học sinh, vi phạm và quỹ lớp."
          action={
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Tạo lớp
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => (
            <div
              key={c.id}
              className="group cursor-pointer rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              onClick={() => (window.location.hash = `/classes/${c.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-700">
                  {c.name.replace(/[^0-9A-Za-zÀ-ỹ]/g, '').slice(0, 2).toUpperCase()}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings2 className="h-4 w-4 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditClass(c)
                      }}
                    >
                      Chỉnh sửa lớp
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteClass(c)
                      }}
                    >
                      Xóa lớp
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="mt-3 text-lg font-bold">{c.name}</h3>
              <p className="text-xs text-muted-foreground">Năm học {c.schoolYear}</p>
              {c.description && <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{c.description}</p>}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Users className="h-4 w-4" /> {c._count.members} học sinh
                </div>
                <Badge
                  variant="outline"
                  className={
                    c.balance >= 0
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }
                >
                  {formatVNDShort(c.balance)}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-700 opacity-0 transition-opacity group-hover:opacity-100">
                Mở quản lý lớp <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateClassModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ['classes'] })
          auth.refresh()
        }}
      />
      <EditClassModal
        cls={editClass}
        onClose={() => setEditClass(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['classes'] })
        }}
      />
      <ConfirmDialog
        open={!!deleteClass}
        onClose={() => setDeleteClass(null)}
        title={`Xóa lớp ${deleteClass?.name}?`}
        description="Toàn bộ học sinh, vi phạm, giao dịch quỹ của lớp này sẽ bị xóa vĩnh viễn. Thao tác không thể hoàn tác."
        confirmText="Xóa lớp"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteClass && deleteMutation.mutate(deleteClass.id)}
      />
    </div>
  )
}
