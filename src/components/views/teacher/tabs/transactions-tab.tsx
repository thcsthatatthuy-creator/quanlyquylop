'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { useClassStudents } from '@/components/views/teacher/tabs/use-class-data'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { formatVND, formatDate } from '@/lib/format'
import { AmountText, TypeBadge, CategoryLabel } from '@/components/shared/badges'
import { TransactionModal } from '@/components/modals/transaction-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, ReceiptText, Trash2, CirclePlus, CircleMinus } from 'lucide-react'

interface TxRow {
  id: string
  type: string
  category: string
  amount: number
  description: string
  note: string | null
  createdAt: string
  student: { fullName: string } | null
  creator: { fullName: string; systemRole: string }
}

export function TransactionsTab({
  classId,
  isManager,
}: {
  classId: string
  isManager: boolean
}) {
  const qc = useQueryClient()
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TxRow | null>(null)
  const [page, setPage] = useState(1)

  const studentsQuery = useClassStudents(classId)

  const { data, isLoading } = useQuery<{ transactions: TxRow[]; total: number; totalPages: number }>({
    queryKey: ['class-transactions', classId, page],
    queryFn: () => apiFetch(`/api/classes/${classId}/transactions?page=${page}&pageSize=30`),
    enabled: !!classId,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['class-transactions', classId] })
    qc.invalidateQueries({ queryKey: ['class-ledger', classId] })
    qc.invalidateQueries({ queryKey: ['class-stats', classId] })
    qc.invalidateQueries({ queryKey: ['class-detail', classId] })
    qc.invalidateQueries({ queryKey: ['classes'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xóa giao dịch (đã ghi audit log).')
      setDeleteTarget(null)
      invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const studentOptions = (studentsQuery.data?.students ?? []).map((s) => ({
    userId: s.userId,
    fullName: s.fullName,
    email: s.email,
    classRole: s.classRole,
  }))

  return (
    <div>
      <PageHeader
        title="Giao dịch quỹ"
        description="Thêm khoản thu (đóng quỹ, tiền phạt) và khoản chi. Số dư do backend tự tính lại."
        actions={
          <>
            <Button variant="destructive" onClick={() => setExpenseOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700">
              <CircleMinus className="h-4 w-4" /> Thêm khoản chi
            </Button>
            <Button onClick={() => setIncomeOpen(true)} className="gap-2">
              <CirclePlus className="h-4 w-4" /> Thêm khoản thu
            </Button>
          </>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : (data?.transactions ?? []).length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Chưa có giao dịch nào"
          description="Ghi nhận khoản thu đầu tiên để bắt đầu hình thành quỹ lớp."
          action={
            <div className="flex gap-2">
              <Button onClick={() => setIncomeOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Thêm khoản thu
              </Button>
              <Button variant="outline" onClick={() => setExpenseOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Thêm khoản chi
              </Button>
            </div>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Ngày</th>
                <th className="px-4 py-3 font-semibold">Loại</th>
                <th className="px-4 py-3 font-semibold">Nội dung</th>
                <th className="px-4 py-3 font-semibold">Người tạo</th>
                <th className="px-4 py-3 text-right font-semibold">Số tiền</th>
                {isManager && <th className="w-16 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {data!.transactions.map((tx) => (
                <tr key={tx.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(tx.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <TypeBadge type={tx.type} />
                      <span className="text-xs text-muted-foreground">
                        <CategoryLabel category={tx.category} />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {tx.student ? `${tx.student.fullName} — ` : ''}
                      {tx.description}
                    </p>
                    {tx.note && <p className="text-xs text-muted-foreground">{tx.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tx.creator.fullName}</td>
                  <td className="px-4 py-3 text-right">
                    <AmountText type={tx.type} amount={tx.amount} />
                  </td>
                  {isManager && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600"
                        onClick={() => setDeleteTarget(tx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Trang {page}/{data.totalPages} — {data.total} giao dịch
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
        </div>
      )}

      <TransactionModal
        open={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        classId={classId}
        type="INCOME"
        students={studentOptions}
        onCreated={invalidate}
      />
      <TransactionModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        classId={classId}
        type="EXPENSE"
        students={studentOptions}
        onCreated={invalidate}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xóa giao dịch quỹ?"
        description={`${deleteTarget?.type === 'INCOME' ? 'Khoản thu' : 'Khoản chi'} ${formatVND(deleteTarget?.amount ?? 0)} — "${deleteTarget?.description}". Thao tác sẽ được ghi vào lịch sử hoạt động.`}
        confirmText="Xóa giao dịch"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
