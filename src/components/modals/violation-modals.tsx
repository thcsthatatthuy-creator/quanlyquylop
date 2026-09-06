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
import { Loader2, Plus } from 'lucide-react'
import { MoneyInput } from '@/components/shared/money-input'
import { formatVND } from '@/lib/format'

interface StudentOption {
  userId: string
  fullName: string
  email: string
  classRole: string
}
interface TypeOption {
  id: string
  name: string
  amount: number
  active: boolean
}

export function AddViolationModal({
  open,
  onClose,
  classId,
  students,
  types,
  onCreated,
  defaultStudentId,
}: {
  open: boolean
  onClose: () => void
  classId: string
  students: StudentOption[]
  types: TypeOption[]
  onCreated: () => void
  defaultStudentId?: string
}) {
  const [studentId, setStudentId] = useState(defaultStudentId ?? '')
  const [typeId, setTypeId] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const activeTypes = types.filter((t) => t.active)

  useEffect(() => {
    if (open) {
      setStudentId(defaultStudentId ?? '')
      setTypeId('')
      setAmount('')
      setDate(new Date().toISOString().slice(0, 10))
      setNote('')
    }
  }, [open, defaultStudentId])

  function pickType(id: string) {
    setTypeId(id)
    const t = activeTypes.find((x) => x.id === id)
    if (t) setAmount(t.amount) // tự động lấy số tiền mặc định từ danh mục
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId) return toast.error('Vui lòng chọn học sinh.')
    if (!typeId) return toast.error('Vui lòng chọn loại vi phạm.')
    if (amount === '' || Number(amount) <= 0) return toast.error('Vui lòng nhập số tiền hợp lệ.')
    setLoading(true)
    try {
      await apiFetch(`/api/classes/${classId}/violations`, {
        method: 'POST',
        json: { studentId, violationTypeId: typeId, amount: Number(amount), date, note: note.trim() },
      })
      toast.success('Đã ghi nhận vi phạm.')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thêm vi phạm thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm vi phạm</DialogTitle>
          <DialogDescription>
            Vi phạm tạo nghĩa vụ nộp tiền — tiền chỉ vào quỹ khi ghi nhận thu tiền phạt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Học sinh *</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn học sinh" />
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Loại vi phạm *</Label>
              {activeTypes.length === 0 && (
                <span className="text-xs text-red-600">Chưa có danh mục vi phạm</span>
              )}
            </div>
            <Select value={typeId} onValueChange={pickType}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại vi phạm" />
              </SelectTrigger>
              <SelectContent>
                {activeTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} — {formatVND(t.amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Số tiền *</Label>
              <MoneyInput value={amount} onChange={setAmount} placeholder="10.000" />
            </div>
            <div className="space-y-1.5">
              <Label>Ngày *</Label>
              <Input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vio-note">Ghi chú</Label>
            <Textarea
              id="vio-note"
              rows={2}
              placeholder="Mô tả thêm (nếu có)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Thêm vi phạm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { Copy } from 'lucide-react'

export function ViolationTypeModal({
  open,
  onClose,
  classId,
  editing,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  classId: string
  editing: { id: string; name: string; amount: number; active: boolean; icon: string | null } | null
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [icon, setIcon] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '')
      setAmount(editing?.amount ?? '')
      setIcon(editing?.icon ?? '')
    }
  }, [open, editing])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Vui lòng nhập tên loại vi phạm.')
    if (amount === '' || Number(amount) <= 0) return toast.error('Vui lòng nhập số tiền mặc định.')
    setLoading(true)
    try {
      if (editing) {
        await apiFetch(`/api/violation-types/${editing.id}`, {
          method: 'PATCH',
          json: { name: name.trim(), amount: Number(amount), icon: icon.trim() || null },
        })
        toast.success('Đã cập nhật loại vi phạm.')
      } else {
        await apiFetch(`/api/classes/${classId}/violation-types`, {
          method: 'POST',
          json: { name: name.trim(), amount: Number(amount), icon: icon.trim() || null },
        })
        toast.success('Đã thêm loại vi phạm.')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Sửa loại vi phạm' : 'Thêm loại vi phạm'}</DialogTitle>
          <DialogDescription>
            Đặt số tiền phạt mặc định — khi ghi nhận vi phạm sẽ tự động áp dụng.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vt-name">Tên loại vi phạm *</Label>
            <Input
              id="vt-name"
              placeholder="Ví dụ: Đi học muộn"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {editing && (
            <div className="space-y-1.5">
              <Label htmlFor="vt-icon">Biểu tượng (Emoji hoặc URL ảnh)</Label>
              <Input
                id="vt-icon"
                placeholder="Ví dụ: ⏰, 🗣️, 📱 hoặc dán link ảnh"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              />
              <p className="text-[10px] text-slate-500">
                Để trống để hệ thống tự động tạo bằng AI theo tên vi phạm.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Số tiền mặc định *</Label>
            <MoneyInput value={amount} onChange={setAmount} placeholder="10.000" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Lưu thay đổi' : 'Thêm loại vi phạm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
