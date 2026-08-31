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
import { apiFetch } from '@/lib/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function CreateClassModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [schoolYear, setSchoolYear] = useState('2026 - 2027')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setSchoolYear('2026 - 2027')
      setDescription('')
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Vui lòng nhập tên lớp.')
    if (!schoolYear.trim()) return toast.error('Vui lòng nhập năm học.')
    setLoading(true)
    try {
      await apiFetch('/api/classes', {
        method: 'POST',
        json: { name: name.trim(), schoolYear: schoolYear.trim(), description: description.trim() },
      })
      toast.success(`Đã tạo lớp ${name.trim()}.`)
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo lớp thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo lớp học mới</DialogTitle>
          <DialogDescription>Bạn sẽ là giáo viên phụ trách lớp này.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cls-name">Tên lớp *</Label>
            <Input
              id="cls-name"
              placeholder="Ví dụ: 10A8"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cls-year">Năm học *</Label>
            <Input
              id="cls-year"
              placeholder="Ví dụ: 2026 - 2027"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cls-desc">Mô tả (không bắt buộc)</Label>
            <Textarea
              id="cls-desc"
              rows={2}
              placeholder="Ghi chú thêm về lớp..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo lớp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditClassModal({
  cls,
  onClose,
  onSaved,
}: {
  cls: { id: string; name: string; schoolYear: string; description: string | null } | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cls) {
      setName(cls.name)
      setSchoolYear(cls.schoolYear)
      setDescription(cls.description ?? '')
    }
  }, [cls])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!cls) return
    if (!name.trim()) return toast.error('Vui lòng nhập tên lớp.')
    setLoading(true)
    try {
      await apiFetch(`/api/classes/${cls.id}`, {
        method: 'PATCH',
        json: { name: name.trim(), schoolYear: schoolYear.trim(), description: description.trim() },
      })
      toast.success('Đã cập nhật lớp học.')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!cls} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa lớp học</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-cls-name">Tên lớp *</Label>
            <Input id="edit-cls-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-cls-year">Năm học *</Label>
            <Input id="edit-cls-year" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-cls-desc">Mô tả</Label>
            <Textarea
              id="edit-cls-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
