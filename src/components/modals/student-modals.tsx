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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { apiFetch } from '@/lib/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { generatePassword } from '@/lib/password-utils'

export function CreateStudentModal({
  open,
  onClose,
  classId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  classId: string
  onCreated: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [classRole, setClassRole] = useState<'STUDENT' | 'TREASURER'>('STUDENT')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setFullName('')
      setEmail('')
      setPassword(generatePassword())
      setClassRole('STUDENT')
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return toast.error('Vui lòng nhập họ và tên.')
    if (!email.trim()) return toast.error('Vui lòng nhập email.')
    if (password.length < 6) return toast.error('Mật khẩu phải có ít nhất 6 ký tự.')
    setLoading(true)
    try {
      await apiFetch(`/api/classes/${classId}/students`, {
        method: 'POST',
        json: { fullName: fullName.trim(), email: email.trim(), password, classRole },
      })
      toast.success(`Đã tạo tài khoản cho ${fullName.trim()}.`)
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo tài khoản thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo tài khoản học sinh</DialogTitle>
          <DialogDescription>
            Tài khoản sẽ được tạo và thêm vào lớp ngay lập tức. Email phải chưa tồn tại trong hệ
            thống.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="stu-name">Họ và tên *</Label>
            <Input
              id="stu-name"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stu-email">Email *</Label>
            <Input
              id="stu-email"
              type="email"
              placeholder="a@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="stu-password">Mật khẩu *</Label>
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Tạo mật khẩu tự động
              </button>
            </div>
            <Input
              id="stu-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vai trò trong lớp</Label>
            <RadioGroup
              value={classRole}
              onValueChange={(v) => setClassRole(v as 'STUDENT' | 'TREASURER')}
              className="flex gap-3"
            >
              <div className="flex flex-1 items-center space-x-2 rounded-lg border border-border px-3 py-2.5 has-[[data-state=checked]]:border-emerald-500 has-[[data-state=checked]]:bg-emerald-50/50">
                <RadioGroupItem value="STUDENT" id="role-student" />
                <Label htmlFor="role-student" className="cursor-pointer font-normal">
                  Học sinh
                </Label>
              </div>
              <div className="flex flex-1 items-center space-x-2 rounded-lg border border-border px-3 py-2.5 has-[[data-state=checked]]:border-emerald-500 has-[[data-state=checked]]:bg-emerald-50/50">
                <RadioGroupItem value="TREASURER" id="role-treasurer" />
                <Label htmlFor="role-treasurer" className="cursor-pointer font-normal">
                  Thủ quỹ
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ResetPasswordModal({
  target,
  onClose,
  classId,
}: {
  target: { userId: string; fullName: string } | null
  onClose: () => void
  classId: string
}) {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (target) setNewPassword(generatePassword())
  }, [target])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!target) return
    if (newPassword.length < 6) return toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.')
    setLoading(true)
    try {
      await apiFetch(`/api/classes/${classId}/students/${target.userId}/reset-password`, {
        method: 'POST',
        json: { newPassword },
      })
      toast.success(`Đã đặt lại mật khẩu cho ${target.fullName}.`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Đặt lại mật khẩu</DialogTitle>
          <DialogDescription>
            Đặt mật khẩu mới cho <b>{target?.fullName}</b>. Bạn không thể xem mật khẩu hiện tại.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-pass">Mật khẩu mới</Label>
              <button
                type="button"
                onClick={() => setNewPassword(generatePassword())}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Tạo tự động
              </button>
            </div>
            <Input
              id="new-pass"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đặt lại mật khẩu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
