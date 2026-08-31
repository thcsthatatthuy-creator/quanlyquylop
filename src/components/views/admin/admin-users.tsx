'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { RoleBadge, StatusBadge } from '@/components/shared/badges'
import { formatDateTime } from '@/lib/format'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { generatePassword } from '@/lib/password-utils'
import { Search, MoreHorizontal, Lock, Unlock, KeyRound, Trash2, CheckCircle2, XCircle } from 'lucide-react'

interface UserRow {
  id: string
  fullName: string
  email: string
  systemRole: string
  status: string
  createdAt: string
  classNames: string[]
}

export function AdminUsers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [resetTarget, setResetTarget] = useState<{ userId: string; fullName: string } | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [lockTarget, setLockTarget] = useState<{ user: UserRow; next: string } | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createData, setCreateData] = useState({ fullName: '', email: '', password: '', systemRole: 'STUDENT' })

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: '15' })
    if (search) p.set('search', search)
    if (role !== 'all') p.set('role', role)
    if (status !== 'all') p.set('status', status)
    return p.toString()
  }, [page, search, role, status])

  const { data, isLoading, error } = useQuery<{ users: UserRow[]; total: number; totalPages: number }>({
    queryKey: ['admin-users', query],
    queryFn: () => apiFetch(`/api/admin/users?${query}`),
  })

  const actionMutation = useMutation({
    mutationFn: (v: { id: string; action: string; extra?: Record<string, unknown> }) =>
      apiFetch(`/api/admin/users/${v.id}`, { method: 'PATCH', json: { action: v.action, ...v.extra } }),
    onSuccess: (_d, v) => {
      toast.success('Đã thực hiện thao tác.')
      setLockTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['pending-teachers-count'] })
      if (v.action === 'SUSPEND' || v.action === 'ACTIVATE') setLockTarget(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xóa tài khoản.')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const resetPwMutation = useMutation({
    mutationFn: (v: { id: string; newPassword: string }) =>
      apiFetch(`/api/admin/users/${v.id}`, {
        method: 'PATCH',
        json: { action: 'RESET_PASSWORD', newPassword: v.newPassword },
      }),
    onSuccess: () => {
      toast.success('Đã đặt lại mật khẩu.')
      setResetTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof createData) => apiFetch('/api/admin/users', { method: 'POST', json: data }),
    onSuccess: () => {
      toast.success('Tạo tài khoản thành công')
      setCreateModalOpen(false)
      setCreateData({ fullName: '', email: '', password: '', systemRole: 'STUDENT' })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader 
        title="Người dùng" 
        description="Quản lý toàn bộ tài khoản trong hệ thống."
        actions={
          <Button onClick={() => setCreateModalOpen(true)}>
            Tạo tài khoản
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={role}
            onValueChange={(v) => {
              setRole(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi vai trò</SelectItem>
              <SelectItem value="TEACHER">Giáo viên</SelectItem>
              <SelectItem value="STUDENT">Học sinh</SelectItem>
              <SelectItem value="ADMIN">Quản trị viên</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi trạng thái</SelectItem>
              <SelectItem value="ACTIVE">Hoạt động</SelectItem>
              <SelectItem value="PENDING">Chờ duyệt</SelectItem>
              <SelectItem value="SUSPENDED">Bị khóa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <EmptyState icon={Search} title="Không thể tải dữ liệu" description={(error as Error).message} />
      ) : (data?.users ?? []).length === 0 ? (
        <EmptyState icon={Search} title="Không tìm thấy người dùng nào" description="Thử đổi từ khóa hoặc bộ lọc." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Họ và tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="w-14 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={u.systemRole} />
                    </TableCell>
                    <TableCell>
                      {u.classNames.length ? (
                        <span className="text-xs text-slate-600">{u.classNames.join(', ')}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {u.systemRole !== 'ADMIN' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {u.status === 'PENDING' ? (
                              <>
                                <DropdownMenuItem
                                  className="text-blue-700"
                                  onClick={() =>
                                    actionMutation.mutate({ id: u.id, action: 'APPROVE' })
                                  }
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> Duyệt
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() =>
                                    actionMutation.mutate({ id: u.id, action: 'REJECT' })
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4" /> Từ chối
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  setLockTarget({
                                    user: u,
                                    next: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                  })
                                }
                              >
                                {u.status === 'ACTIVE' ? (
                                  <>
                                    <Lock className="mr-2 h-4 w-4" /> Khóa tài khoản
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="mr-2 h-4 w-4" /> Mở khóa
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setResetPassword(generatePassword())
                                setResetTarget({ userId: u.id, fullName: u.fullName })
                              }}
                            >
                              <KeyRound className="mr-2 h-4 w-4" /> Đặt lại mật khẩu
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-700"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Xóa tài khoản
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Trang {page}/{data.totalPages} — {data.total} người dùng
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Trước
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Sau
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Admin reset password modal */}
      <Dialog open={!!resetTarget} onOpenChange={(v) => !v && setResetTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
            <DialogDescription>
              Đặt mật khẩu mới cho <b>{resetTarget?.fullName}</b>. Không thể xem mật khẩu hiện tại.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Mật khẩu mới</Label>
                <button
                  type="button"
                  onClick={() => setResetPassword(generatePassword())}
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Tạo tự động
                </button>
              </div>
              <Input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Hủy
            </Button>
            <Button
              disabled={resetPwMutation.isPending || resetPassword.length < 6}
              onClick={() =>
                resetTarget && resetPwMutation.mutate({ id: resetTarget.userId, newPassword: resetPassword })
              }
            >
              Đặt lại mật khẩu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Admin create user modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo tài khoản mới</DialogTitle>
            <DialogDescription>Tạo thủ công tài khoản Giáo viên hoặc Học sinh.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Họ và tên</Label>
              <Input 
                value={createData.fullName} 
                onChange={(e) => setCreateData({ ...createData, fullName: e.target.value })} 
                placeholder="Nguyễn Văn A" 
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input 
                type="email"
                value={createData.email} 
                onChange={(e) => setCreateData({ ...createData, email: e.target.value })} 
                placeholder="email@example.com" 
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Mật khẩu</Label>
                <button
                  type="button"
                  onClick={() => setCreateData({ ...createData, password: generatePassword() })}
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Tạo tự động
                </button>
              </div>
              <Input 
                value={createData.password} 
                onChange={(e) => setCreateData({ ...createData, password: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              <Select
                value={createData.systemRole}
                onValueChange={(v) => setCreateData({ ...createData, systemRole: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Học sinh</SelectItem>
                  <SelectItem value="TEACHER">Giáo viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button 
              disabled={createMutation.isPending || !createData.fullName || !createData.email || createData.password.length < 6}
              onClick={() => createMutation.mutate(createData)}
            >
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!lockTarget}
        onClose={() => setLockTarget(null)}
        title={lockTarget?.next === 'SUSPENDED' ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
        description={
          lockTarget?.next === 'SUSPENDED'
            ? `${lockTarget?.user.fullName} sẽ không thể đăng nhập.`
            : `${lockTarget?.user.fullName} sẽ đăng nhập lại được bình thường.`
        }
        confirmText={lockTarget?.next === 'SUSPENDED' ? 'Khóa' : 'Mở khóa'}
        destructive={lockTarget?.next === 'SUSPENDED'}
        loading={actionMutation.isPending}
        onConfirm={() =>
          lockTarget &&
          actionMutation.mutate({
            id: lockTarget.user.id,
            action: lockTarget.next === 'SUSPENDED' ? 'SUSPEND' : 'ACTIVATE',
          })
        }
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Xóa tài khoản ${deleteTarget?.fullName}?`}
        description="Toàn bộ dữ liệu liên quan (vi phạm, giao dịch) sẽ bị xóa vĩnh viễn. Thao tác không thể hoàn tác."
        confirmText="Xóa tài khoản"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
