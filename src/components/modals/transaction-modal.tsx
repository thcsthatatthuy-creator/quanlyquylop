'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiFetch } from '@/lib/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { MoneyInput } from '@/components/shared/money-input'

interface StudentOption {
  userId: string
  fullName: string
  classRole: string
}

const INCOME_CATEGORIES = [
  { value: 'FUND_CONTRIBUTION', label: 'Đóng quỹ' },
  { value: 'PENALTY_PAYMENT', label: 'Tiền phạt' },
  { value: 'OTHER_INCOME', label: 'Thu khác' },
]
const EXPENSE_CATEGORIES = [
  { value: 'SUPPLIES', label: 'Đồ dùng lớp' },
  { value: 'ACTIVITY', label: 'Hoạt động' },
  { value: 'DECORATION', label: 'Trang trí' },
  { value: 'OTHER_EXPENSE', label: 'Chi khác' },
]

/**
 * Modal thêm khoản thu / khoản chi.
 * Số dư do backend tính lại sau khi tạo — frontend không tự quyết.
 */
export function TransactionModal({
  open,
  onClose,
  classId,
  type,
  students,
  onCreated,
  defaultStudentId,
  defaultCategory,
}: {
  open: boolean
  onClose: () => void
  classId: string
  type: 'INCOME' | 'EXPENSE'
  students: StudentOption[]
  onCreated: () => void
  defaultStudentId?: string
  defaultCategory?: string
}) {
  const [category, setCategory] = useState(defaultCategory ?? (type === 'INCOME' ? 'FUND_CONTRIBUTION' : 'SUPPLIES'))
  const [studentId, setStudentId] = useState(defaultStudentId ?? '')
  const [amount, setAmount] = useState<number | ''>('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const isPenalty = type === 'INCOME' && category === 'PENALTY_PAYMENT'

  useEffect(() => {
    if (open) {
      setCategory(defaultCategory ?? (type === 'INCOME' ? 'FUND_CONTRIBUTION' : 'SUPPLIES'))
      setStudentId(defaultStudentId ?? '')
      setAmount('')
      setDate(new Date().toISOString().slice(0, 10))
      setDescription('')
      setNote('')
    }
  }, [open, type, defaultCategory, defaultStudentId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (amount === '' || Number(amount) <= 0) return toast.error('Vui lòng nhập số tiền hợp lệ.')
    if (isPenalty && !studentId) return toast.error('Khoản thu tiền phạt phải chọn học sinh nộp.')
    setLoading(true)
    try {
      await apiFetch(`/api/classes/${classId}/transactions`, {
        method: 'POST',
        json: {
          type,
          category,
          amount: Number(amount),
          studentId: type === 'INCOME' ? studentId || null : null,
          date,
          description: description.trim(),
          note: note.trim(),
        },
      })
      toast.success(type === 'INCOME' ? 'Đã ghi nhận khoản thu.' : 'Đã ghi nhận khoản chi.')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo giao dịch thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{type === 'INCOME' ? 'Thêm khoản thu' : 'Thêm khoản chi'}</DialogTitle>
          <DialogDescription>
            {type === 'INCOME'
              ? 'Ghi nhận tiền đóng quỹ / tiền phạt đã nộp / thu khác.'
              : 'Ghi nhận chi tiêu của quỹ lớp (đồ dùng, hoạt động...).'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{type === 'INCOME' ? 'Loại khoản thu *' : 'Danh mục chi *'}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Số tiền *</Label>
              <MoneyInput value={amount} onChange={setAmount} placeholder="100.000" />
            </div>
          </div>

          {type === 'INCOME' && (
            <div className="space-y-1.5">
              <Label>
                Học sinh {isPenalty ? '*' : '(không bắt buộc)'}
              </Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder={isPenalty ? 'Chọn học sinh nộp tiền phạt' : 'Chọn học sinh (nếu có)'} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {students.map((s) => (
                    <SelectItem key={s.userId} value={s.userId}>
                      {s.fullName} {s.classRole === 'TREASURER' ? '(Thủ quỹ)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Ngày *</Label>
            <Input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Nội dung</Label>
            <Input
              id="tx-desc"
              placeholder={type === 'INCOME' ? 'Ví dụ: Đóng quỹ tháng 9' : 'Ví dụ: Mua phấn'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-note">Ghi chú</Label>
            <Textarea
              id="tx-note"
              rows={2}
              placeholder="Ghi chú thêm (nếu có)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading} className={type === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' : ''}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {type === 'INCOME' ? 'Ghi nhận khoản thu' : 'Ghi nhận khoản chi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
