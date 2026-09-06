'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { useClassStudents } from '@/components/views/teacher/tabs/use-class-data'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { RoleBadge, StatusBadge } from '@/components/shared/badges'
import { formatVND } from '@/lib/format'
import { CreateStudentModal, ResetPasswordModal } from '@/components/modals/student-modals'
import { ImportStudentsModal } from '@/components/modals/import-students-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Upload,
  Download,
  MoreHorizontal,
  Eye,
  KeyRound,
  Lock,
  Unlock,
  UserCog,
  UserMinus,
  Users,
} from 'lucide-react'

export function StudentsTab({ classId, isManager, onViewProfile }: { classId: string; isManager: boolean; onViewProfile?: (userId: string) => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<{ userId: string; fullName: string } | null>(null)
  const [roleTarget, setRoleTarget] = useState<{ userId: string; fullName: string; classRole: string } | null>(null)
  const [lockTarget, setLockTarget] = useState<{ userId: string; fullName: string; status: string } | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; fullName: string } | null>(null)

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: '10', sort })
    if (search) p.set('search', search)
    if (role !== 'all') p.set('role', role)
    if (status !== 'all') p.set('status', status)
    return p.toString()
  }, [page, search, role, status, sort])

  const { data, isLoading, error } = useQuery<{ students: any[]; total: number; totalPages: number }>({
    queryKey: ['class-students', classId, query],
    queryFn: () => apiFetch(`/api/classes/${classId}/students?${query}`),
    enabled: !!classId,
  })

  const roleMutation = useMutation({
    mutationFn: (v: { userId: string; classRole: string }) =>
      apiFetch(`/api/classes/${classId}/students/${v.userId}`, {
        method: 'PATCH',
        json: { classRole: v.classRole },
      }),
    onSuccess: (_d, v) => {
      toast.success(
        v.classRole === 'TREASURER'
          ? 'Đã gán làm thủ quỹ. Thủ quỹ cũ (nếu có) chuyển thành học sinh.'
          : 'Đã chuyển thành học sinh.'
      )
      setRoleTarget(null)
      qc.invalidateQueries({ queryKey: ['class-students', classId] })
    },
    onError: (e) => toast.error(e.message),
  })

  const lockMutation = useMutation({
    mutationFn: (v: { userId: string; status: string }) =>
      apiFetch(`/api/users/${v.userId}/status`, { method: 'PATCH', json: { status: v.status } }),
    onSuccess: (_d, v) => {
      toast.success(v.status === 'SUSPENDED' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.')
      setLockTarget(null)
      qc.invalidateQueries({ queryKey: ['class-students', classId] })
    },
    onError: (e) => toast.error(e.message),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/classes/${classId}/students/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xóa học sinh khỏi lớp.')
      setRemoveTarget(null)
      qc.invalidateQueries({ queryKey: ['class-students', classId] })
    },
    onError: (e) => toast.error(e.message),
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['class-students', classId] })
    qc.invalidateQueries({ queryKey: ['class-detail', classId] })
  }

  const students = data?.students ?? []

  return (
    <div>
      <PageHeader
        title="Học sinh"
        description="Tạo tài khoản, phân quyền thủ quỹ và quản lý học sinh trong lớp."
        actions={
          isManager && (
            <>
              <Button variant="outline" onClick={() => window.open(`/api/classes/${classId}/export`, '_blank')} className="gap-2">
                <Download className="h-4 w-4" /> Xuất Excel
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" /> Import Excel
              </Button>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Tạo tài khoản
              </Button>
            </>
          )
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
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi vai trò</SelectItem>
              <SelectItem value="STUDENT">Học sinh</SelectItem>
              <SelectItem value="TREASURER">Thủ quỹ</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi trạng thái</SelectItem>
              <SelectItem value="ACTIVE">Hoạt động</SelectItem>
              <SelectItem value="SUSPENDED">Bị khóa</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Tên A-Z</SelectItem>
              <SelectItem value="violation">Vi phạm nhiều nhất</SelectItem>
              <SelectItem value="violationAsc">Vi phạm ít nhất</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <EmptyState icon={Users} title="Không thể tải danh sách" description={(error as Error).message} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search || role !== 'all' || status !== 'all' ? 'Không tìm thấy học sinh nào' : 'Chưa có học sinh'}
          description={
            search || role !== 'all' || status !== 'all'
              ? 'Thử đổi từ khóa hoặc bộ lọc.'
              : 'Tạo tài khoản học sinh hoặc import từ Excel để bắt đầu.'
          }
          action={
            isManager && !search && role === 'all' && status === 'all' ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
                  <Upload className="h-4 w-4" /> Import Excel
                </Button>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Tạo tài khoản học sinh
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop: bảng */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">STT</TableHead>
                  <TableHead>Họ và tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="text-right">Tổng vi phạm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-20 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, i) => (
                  <TableRow key={s.membershipId}>
                    <TableCell className="text-muted-foreground">{(page - 1) * 10 + i + 1}</TableCell>
                    <TableCell>
                      <button
                        className="font-medium hover:text-blue-700 hover:underline"
                        onClick={() => onViewProfile ? onViewProfile(s.userId) : undefined}
                      >
                        {s.fullName}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={s.classRole} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatVND(s.violationTotal)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => onViewProfile ? onViewProfile(s.userId) : undefined}
                          >
                            <Eye className="mr-2 h-4 w-4" /> Xem hồ sơ
                          </DropdownMenuItem>
                          {isManager && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  setRoleTarget({ userId: s.userId, fullName: s.fullName, classRole: s.classRole })
                                }
                              >
                                <UserCog className="mr-2 h-4 w-4" />
                                {s.classRole === 'TREASURER' ? 'Gỡ quyền thủ quỹ' : 'Gán làm thủ quỹ'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setResetTarget({ userId: s.userId, fullName: s.fullName })}>
                                <KeyRound className="mr-2 h-4 w-4" /> Đặt lại mật khẩu
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setLockTarget({
                                    userId: s.userId,
                                    fullName: s.fullName,
                                    status: s.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                  })
                                }
                              >
                                {s.status === 'ACTIVE' ? (
                                  <>
                                    <Lock className="mr-2 h-4 w-4" /> Khóa tài khoản
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="mr-2 h-4 w-4" /> Mở khóa tài khoản
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-700"
                                onClick={() => setRemoveTarget({ userId: s.userId, fullName: s.fullName })}
                              >
                                <UserMinus className="mr-2 h-4 w-4" /> Xóa khỏi lớp
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: card */}
          <div className="space-y-2.5 md:hidden">
            {students.map((s) => (
              <div key={s.membershipId} className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="min-w-0 text-left"
                    onClick={() => onViewProfile ? onViewProfile(s.userId) : undefined}
                  >
                    <p className="truncate font-semibold">{s.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                  </button>
                  <RoleBadge role={s.classRole} />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-sm">
                  <span className="text-red-700 font-medium">Vi phạm: {formatVND(s.violationTotal)}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-3 flex gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={() => onViewProfile ? onViewProfile(s.userId) : undefined}
                    >
                      <Eye className="h-3.5 w-3.5" /> Xem
                    </Button>
                  {isManager && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() =>
                          setRoleTarget({ userId: s.userId, fullName: s.fullName, classRole: s.classRole })
                        }
                      >
                        <UserCog className="h-3.5 w-3.5" /> Đổi quyền
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResetTarget({ userId: s.userId, fullName: s.fullName })}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setLockTarget({
                            userId: s.userId,
                            fullName: s.fullName,
                            status: s.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                          })
                        }
                      >
                        {s.status === 'ACTIVE' ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => setRemoveTarget({ userId: s.userId, fullName: s.fullName })}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Trang {page}/{data.totalPages} — {data.total} học sinh
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateStudentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        classId={classId}
        onCreated={invalidateAll}
      />
      <ImportStudentsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        classId={classId}
        onImported={invalidateAll}
      />
      <ResetPasswordModal
        classId={classId}
        target={resetTarget}
        onClose={() => setResetTarget(null)}
      />
      <ConfirmDialog
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        title={roleTarget?.classRole === 'TREASURER' ? 'Gỡ quyền thủ quỹ?' : 'Gán làm thủ quỹ?'}
        description={
          roleTarget?.classRole === 'TREASURER'
            ? `${roleTarget?.fullName} sẽ chuyển về vai trò Học sinh.`
            : `${roleTarget?.fullName} sẽ được gán vai trò Thủ quỹ và có quyền ghi nhận vi phạm, thu/chi quỹ.`
        }
        confirmText="Xác nhận"
        loading={roleMutation.isPending}
        onConfirm={() =>
          roleTarget &&
          roleMutation.mutate({
            userId: roleTarget.userId,
            classRole: roleTarget.classRole === 'TREASURER' ? 'STUDENT' : 'TREASURER',
          })
        }
      />
      <ConfirmDialog
        open={!!lockTarget}
        onClose={() => setLockTarget(null)}
        title={lockTarget?.status === 'SUSPENDED' ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
        description={
          lockTarget?.status === 'SUSPENDED'
            ? `${lockTarget?.fullName} sẽ không thể đăng nhập cho tới khi được mở khóa.`
            : `${lockTarget?.fullName} sẽ có thể đăng nhập lại bình thường.`
        }
        confirmText={lockTarget?.status === 'SUSPENDED' ? 'Khóa' : 'Mở khóa'}
        destructive={lockTarget?.status === 'SUSPENDED'}
        loading={lockMutation.isPending}
        onConfirm={() => lockTarget && lockMutation.mutate({ userId: lockTarget.userId, status: lockTarget.status })}
      />
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title={`Xóa ${removeTarget?.fullName} khỏi lớp?`}
        description="Học sinh sẽ mất quyền truy cập lớp này. Lịch sử vi phạm cũ vẫn được giữ lại."
        confirmText="Xóa khỏi lớp"
        destructive
        loading={removeMutation.isPending}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.userId)}
      />
    </div>
  )
}
