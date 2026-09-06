'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, navigate } from '@/lib/client'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { formatVNDShort, formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { School, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'

interface AdminClassRow {
  id: string
  name: string
  schoolYear: string
  description: string | null
  teacher: { fullName: string; email: string }
  _count: { members: number; violations: number; transactions: number }
  balance: number
  createdAt: string
}

export function AdminClasses() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [deleteClass, setDeleteClass] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, error } = useQuery<{ classes: AdminClassRow[] }>({
    queryKey: ['admin-classes', search],
    queryFn: () => apiFetch(`/api/admin/classes${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/classes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xóa lớp học.')
      setDeleteClass(null)
      qc.invalidateQueries({ queryKey: ['admin-classes'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader title="Lớp học" description="Toàn bộ lớp học trong hệ thống." />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-9 w-full rounded-md border border-input bg-white pl-9 text-sm"
          placeholder="Tìm theo tên lớp hoặc giáo viên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <EmptyState icon={School} title="Không thể tải dữ liệu" description={(error as Error).message} />
      ) : (data?.classes ?? []).length === 0 ? (
        <EmptyState icon={School} title="Chưa có lớp học nào" description="Giáo viên tạo lớp sẽ hiển thị tại đây." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data!.classes.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-700">
                  {c.name.slice(0, 2).toUpperCase()}
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
              <h3 className="mt-3 font-bold">{c.name}</h3>
              <p className="text-xs text-muted-foreground">
                Năm học {c.schoolYear} · GVCN: {c.teacher.fullName}
              </p>
              <p className="text-xs text-muted-foreground">{c.teacher.email}</p>
              <div className="mt-3 flex gap-4 border-t border-border pt-3 text-xs text-slate-600">
                <span>{c._count.members} học sinh</span>
                <span>{c._count.violations} vi phạm</span>
                <span>{c._count.transactions} giao dịch</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Tạo ngày {formatDate(c.createdAt)}</p>
              <div className="mt-4 pt-4 border-t border-border flex gap-2">
                <Button variant="outline" className="flex-1 text-blue-700 hover:text-blue-800" onClick={() => navigate(`/admin/classes/${c.id}`)}>
                  Vào lớp
                </Button>
                <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setDeleteClass({ id: c.id, name: c.name })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

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
