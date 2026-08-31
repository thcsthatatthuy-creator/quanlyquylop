'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { useClassStudents, useViolationTypes } from '@/components/views/teacher/tabs/use-class-data'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { formatVND, formatDate } from '@/lib/format'
import { AddViolationModal, ViolationTypeModal } from '@/components/modals/violation-modals'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Plus,
  TriangleAlert,
  Pencil,
  Trash2,
  Tags,
  Gavel,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface ViolationRow {
  id: string
  amount: number
  note: string | null
  createdAt: string
  student: { id: string; fullName: string }
  violationType: { id: string; name: string }
  creator: { fullName: string; systemRole: string }
}

export function ViolationsTab({
  classId,
  isManager,
  onChanged,
}: {
  classId: string
  isManager: boolean
  onChanged: () => void
}) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<{ id: string; name: string; amount: number; active: boolean } | null>(null)
  const [deleteType, setDeleteType] = useState<{ id: string; name: string } | null>(null)
  const [deleteViolation, setDeleteViolation] = useState<ViolationRow | null>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(true)

  const studentsQuery = useClassStudents(classId)
  const typesQuery = useViolationTypes(classId)

  const { data, isLoading } = useQuery<{
    violations: ViolationRow[]
    total: number
    totalAmount: number
  }>({
    queryKey: ['class-violations', classId],
    queryFn: () => apiFetch(`/api/classes/${classId}/violations?pageSize=100`),
    enabled: !!classId,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['class-violations', classId] })
    qc.invalidateQueries({ queryKey: ['class-students', classId] })
    qc.invalidateQueries({ queryKey: ['class-detail', classId] })
    qc.invalidateQueries({ queryKey: ['class-stats', classId] })
    onChanged()
  }

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/violation-types/${id}`, { method: 'DELETE' }),
    onSuccess: (res: { deactivated?: boolean; message?: string }) => {
      if (res.deactivated) toast.info(res.message ?? 'Đã vô hiệu hóa loại vi phạm.')
      else toast.success('Đã xóa loại vi phạm.')
      setDeleteType(null)
      qc.invalidateQueries({ queryKey: ['violation-types', classId] })
    },
    onError: (e) => toast.error(e.message),
  })

  const toggleTypeMutation = useMutation({
    mutationFn: (v: { id: string; active: boolean }) =>
      apiFetch(`/api/violation-types/${v.id}`, { method: 'PATCH', json: { active: v.active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['violation-types', classId] }),
    onError: (e) => toast.error(e.message),
  })

  const deleteViolationMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/violations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xóa vi phạm.')
      setDeleteViolation(null)
      invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const canAdd = isManager || true // quyền đã lọc ở backend; tab này chỉ dành cho teacher/treasurer/admin

  return (
    <div className="space-y-6">
      {/* Danh mục vi phạm */}
      <div>
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
            onClick={() => setCategoriesOpen((v) => !v)}
          >
            <Tags className="h-5 w-5 text-blue-700" />
            Danh mục vi phạm
            {categoriesOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {isManager && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditingType(null)
                setTypeModalOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Thêm loại
            </Button>
          )}
        </div>

        {categoriesOpen && (
          <div className="mt-3">
            {typesQuery.isLoading ? (
              <LoadingBlock />
            ) : (typesQuery.data?.violationTypes ?? []).length === 0 ? (
              <EmptyState
                icon={Tags}
                title="Chưa có loại vi phạm nào"
                description="Tạo danh mục để ghi nhận vi phạm nhanh (không cần nhập lại tên + tiền mỗi lần)."
                action={
                  isManager ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingType(null)
                        setTypeModalOpen(true)
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Thêm loại vi phạm
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {typesQuery.data!.violationTypes.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between rounded-lg border border-border bg-white px-3.5 py-2.5 ${!t.active ? 'opacity-50' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatVND(t.amount)} · {t._count.violations} lượt
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isManager && (
                        <>
                          <Switch
                            checked={t.active}
                            onCheckedChange={(v) => toggleTypeMutation.mutate({ id: t.id, active: v })}
                            aria-label={t.active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingType({ id: t.id, name: t.name, amount: t.amount, active: t.active })
                              setTypeModalOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600"
                            onClick={() => setDeleteType({ id: t.id, name: t.name })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lịch sử vi phạm */}
      <div>
        <PageHeader
          title="Lịch sử vi phạm"
          actions={
            canAdd && (
              <Button onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Thêm vi phạm
              </Button>
            )
          }
        />

        {isLoading ? (
          <LoadingBlock />
        ) : (data?.violations ?? []).length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="Chưa có vi phạm nào được ghi nhận"
            description="Nhấn “Thêm vi phạm” để ghi nhận học sinh vi phạm theo danh mục có sẵn."
            action={
              canAdd && (
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Thêm vi phạm
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ngày</th>
                  <th className="px-4 py-3 font-semibold">Học sinh</th>
                  <th className="px-4 py-3 font-semibold">Loại vi phạm</th>
                  <th className="px-4 py-3 font-semibold">Ghi nhận bởi</th>
                  <th className="px-4 py-3 text-right font-semibold">Số tiền</th>
                  {isManager && <th className="w-16 px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {data!.violations.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(v.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{v.student.fullName}</td>
                    <td className="px-4 py-3">
                      {v.violationType.name}
                      {v.note && <p className="text-xs text-muted-foreground">{v.note}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.creator.fullName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-700 tabular-nums">
                      {formatVND(v.amount)}
                    </td>
                    {isManager && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600"
                          onClick={() => setDeleteViolation(v)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-slate-50">
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold">
                    Tổng ({data!.total} vi phạm)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-700 tabular-nums">
                    {formatVND(data!.totalAmount)}
                  </td>
                  {isManager && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddViolationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classId={classId}
        students={(studentsQuery.data?.students ?? []).map((s) => ({
          userId: s.userId,
          fullName: s.fullName,
          email: s.email,
          classRole: s.classRole,
        }))}
        types={typesQuery.data?.violationTypes ?? []}
        onCreated={invalidate}
      />
      <ViolationTypeModal
        open={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        classId={classId}
        editing={editingType}
        onSaved={() => qc.invalidateQueries({ queryKey: ['violation-types', classId] })}
      />
      <ConfirmDialog
        open={!!deleteType}
        onClose={() => setDeleteType(null)}
        title={`Xóa loại vi phạm "${deleteType?.name}"?`}
        description="Nếu đã có vi phạm ghi nhận theo loại này, hệ thống sẽ chỉ vô hiệu hóa thay vì xóa."
        confirmText="Xóa"
        destructive
        loading={deleteTypeMutation.isPending}
        onConfirm={() => deleteType && deleteTypeMutation.mutate(deleteType.id)}
      />
      <ConfirmDialog
        open={!!deleteViolation}
        onClose={() => setDeleteViolation(null)}
        title="Xóa bản ghi vi phạm?"
        description={`${deleteViolation?.student.fullName} — ${deleteViolation?.violationType.name} (${formatVND(deleteViolation?.amount ?? 0)}). Thao tác sẽ được ghi vào lịch sử hoạt động.`}
        confirmText="Xóa vi phạm"
        destructive
        loading={deleteViolationMutation.isPending}
        onConfirm={() => deleteViolation && deleteViolationMutation.mutate(deleteViolation.id)}
      />
    </div>
  )
}
