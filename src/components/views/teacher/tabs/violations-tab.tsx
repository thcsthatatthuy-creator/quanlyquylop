'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { useClassStudents, useViolationTypes } from '@/components/views/teacher/tabs/use-class-data'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { formatVND, formatDate } from '@/lib/format'
import { AddViolationModal, ViolationTypeModal } from '@/components/modals/violation-modals'
import { ViolationActionView } from '@/components/modals/violation-action-view'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  const [editingType, setEditingType] = useState<{ id: string; name: string; amount: number; active: boolean; icon: string | null } | null>(null)
  
  // Selection states
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Modal states
  const [actionModalStudents, setActionModalStudents] = useState<any[]>([])
  const [actionViewStudents, setActionViewStudents] = useState<any[]>([])
  
  const [deleteType, setDeleteType] = useState<{ id: string; name: string } | null>(null)
  const [deleteViolation, setDeleteViolation] = useState<ViolationRow | null>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false) // Collapse by default to focus on students

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

  const toggleSelection = (userId: string) => {
    setSelectedIds((prev) => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const openActionModalForSelected = () => {
    if (!studentsQuery.data) return
    const selected = studentsQuery.data.students.filter(s => selectedIds.includes(s.userId))
    if (selected.length > 0) {
      setActionViewStudents(selected)
    }
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
      {/* When a student is clicked, show inline action view */}
      {actionViewStudents.length > 0 && (
        <ViolationActionView
          classId={classId}
          students={actionViewStudents}
          allStudents={studentsQuery.data?.students ?? []}
          types={typesQuery.data?.violationTypes ?? []}
          onCreated={() => {
            invalidate()
            if (isMultiSelect) {
              setSelectedIds([])
              setActionViewStudents([])
            }
          }}
          onClose={() => { setActionViewStudents([]); setSelectedIds([]) }}
        />
      )}
      {actionViewStudents.length === 0 && (
      <>
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
              <div className="overflow-x-auto rounded-xl border border-border bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-center w-16">Icon</th>
                      <th className="px-4 py-3 font-semibold">Tiêu chí vi phạm</th>
                      <th className="px-4 py-3 font-semibold">Điểm trừ (Tiền)</th>
                      <th className="px-4 py-3 font-semibold text-center">Hiển thị</th>
                      {isManager && <th className="w-24 px-4 py-3 text-right font-semibold">Hành động</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {typesQuery.data!.violationTypes.map((t) => (
                      <tr key={t.id} className={`border-t border-border ${!t.active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3 text-center text-xl">
                          {t.icon ? (
                            t.icon.startsWith('http') || t.icon.startsWith('/') ? (
                              <img src={t.icon} alt={t.name} className="w-8 h-8 object-cover rounded mx-auto" />
                            ) : (
                              t.icon
                            )
                          ) : (
                            '⚠️'
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {t.name}
                          <p className="text-xs text-muted-foreground font-normal">{t._count.violations} lượt áp dụng</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-red-600">-{formatVND(t.amount)}</td>
                        <td className="px-4 py-3 text-center">
                           <Switch
                             checked={t.active}
                             disabled={!isManager}
                             onCheckedChange={(v) => toggleTypeMutation.mutate({ id: t.id, active: v })}
                           />
                        </td>
                        {isManager && (
                          <td className="px-4 py-3 text-right">
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-8 w-8 text-blue-600"
                               onClick={() => {
                                 setEditingType({ id: t.id, name: t.name, amount: t.amount, active: t.active, icon: t.icon })
                                 setTypeModalOpen(true)
                               }}
                             >
                               <Pencil className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-8 w-8 text-red-600"
                               onClick={() => setDeleteType({ id: t.id, name: t.name })}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lịch sử vi phạm (Thay bằng Học sinh vi phạm grid) */}
      <div className="relative pb-20">
        <PageHeader
          title="Học sinh vi phạm"
          description="Nhấn vào học sinh để ghi nhận nhanh vi phạm hoặc xem tổng điểm trừ."
          action={
            <Button 
              variant={isMultiSelect ? "default" : "outline"}
              className={isMultiSelect ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => {
                setIsMultiSelect(!isMultiSelect)
                if (isMultiSelect) setSelectedIds([])
              }}
            >
              {isMultiSelect ? "Hủy chọn nhiều" : "Chọn nhiều"}
            </Button>
          }
        />

        {studentsQuery.isLoading ? (
          <LoadingBlock />
        ) : (studentsQuery.data?.students ?? []).length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="Lớp chưa có học sinh"
            description="Hãy thêm học sinh vào lớp trước khi ghi nhận vi phạm."
          />
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mt-4">
            {studentsQuery.data!.students.map((s) => {
              const isSelected = selectedIds.includes(s.userId)
              return (
                <div
                  key={s.userId}
                  className={`flex flex-col items-center p-4 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-all cursor-pointer relative group h-full ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' : 'border-blue-100 hover:border-blue-300'
                  }`}
                  onClick={() => {
                    if (isMultiSelect) {
                      toggleSelection(s.userId)
                    } else {
                      setActionViewStudents([s])
                    }
                  }}
                >
                  <div className="absolute top-2 right-2 opacity-100 transition-opacity">
                    {isMultiSelect ? (
                       <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                         {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                       </div>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full bg-blue-50 hover:bg-blue-100">
                           <Plus className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Avatar className={`h-20 w-20 mb-3 border-[3px] border-dashed ${isSelected ? 'border-blue-500' : 'border-[#1877f2]'} p-1 bg-white`}>
                    <AvatarImage src={s.avatar || '/avatars/boy.jpg'} alt={s.fullName} className="rounded-full object-cover" />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-2xl rounded-full">
                      {s.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-bold text-slate-800 text-center line-clamp-2 min-h-[40px] mb-2 w-full" title={s.fullName}>
                    {s.fullName}
                  </p>
                  <div className="flex flex-col items-center mt-auto w-full pt-2 border-t border-slate-50">
                     <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Tổng phạt</p>
                     <p className="text-sm font-bold text-[#e11d48]">
                       {formatVND(s.violationTotal)}
                     </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Sticky Action Bar for Multi-select */}
        {isMultiSelect && selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-2xl border border-slate-200 px-6 py-4 flex items-center gap-6 z-40 animate-in slide-in-from-bottom-10">
            <span className="font-bold text-slate-700">
              Đã chọn: <span className="text-blue-600 text-lg">{selectedIds.length}</span> học sinh
            </span>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedIds([])} className="rounded-full">
                Bỏ chọn
              </Button>
              <Button className="bg-red-600 hover:bg-red-700 rounded-full font-bold shadow-md shadow-red-200" onClick={openActionModalForSelected}>
                Thêm vi phạm
              </Button>
            </div>
          </div>
        )}
      </div>

      </>
      )}

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
