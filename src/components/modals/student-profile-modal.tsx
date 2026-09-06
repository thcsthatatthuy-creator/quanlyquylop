import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiFetch } from '@/lib/client'
import { formatVND, formatDate, formatDateTime } from '@/lib/format'
import { RoleBadge, StatusBadge } from '@/components/shared/badges'
import { LoadingBlock } from '@/components/shared/ui-bits'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, Inbox, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Image from 'next/image'

interface ProfileData {
  student: {
    membershipId: string
    userId: string
    fullName: string
    email: string
    status: string
    classRole: string
    violationTotal: number
    violationCount: number
    joinedAt: string
    gender: string | null
    avatar: string | null
  }
  violations: {
    id: string
    amount: number
    note: string | null
    createdAt: string
    violationType: { name: string }
  }[]
}

const AVATAR_OPTIONS = [
  '/avatars/boy.jpg',
  '/avatars/girl.jpg',
  '/avatars/boy2.jpg',
  '/avatars/girl2.jpg',
]

export function StudentProfileModal({
  classId,
  target,
  isManager,
  onClose,
}: {
  classId: string
  target: { membershipId: string; userId: string; fullName: string } | null
  isManager?: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editGender, setEditGender] = useState<string>('')
  const [editAvatar, setEditAvatar] = useState<string>('')

  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['student-profile', classId, target?.userId],
    queryFn: () =>
      apiFetch(`/api/classes/${classId}/students/${target!.userId}/profile`),
    enabled: !!target && !!classId,
  })

  useEffect(() => {
    if (data?.student) {
      setEditGender(data.student.gender || 'MALE')
      setEditAvatar(data.student.avatar || AVATAR_OPTIONS[0])
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (v: { gender: string; avatar: string }) =>
      apiFetch(`/api/classes/${classId}/students/${target!.userId}/profile`, {
        method: 'PATCH',
        json: v,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật hồ sơ')
      setIsEditing(false)
      qc.invalidateQueries({ queryKey: ['student-profile', classId, target?.userId] })
      qc.invalidateQueries({ queryKey: ['class-students', classId] })
    },
    onError: (e) => toast.error(e.message),
  })

  const handleClose = () => {
    setIsEditing(false)
    onClose()
  }

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center pr-4">
            <span>Hồ sơ học sinh</span>
            {isManager && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8 gap-2">
                <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>Thông tin vi phạm và tình trạng đóng góp của học sinh.</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <LoadingBlock />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 shrink-0 relative rounded-full overflow-hidden border border-slate-200">
                  <Image 
                    src={data.student.avatar || AVATAR_OPTIONS[0]} 
                    alt="avatar" 
                    fill 
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold leading-tight">{data.student.fullName}</p>
                      <p className="text-sm text-muted-foreground">{data.student.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">Giới tính: {data.student.gender === 'FEMALE' ? 'Nữ' : 'Nam'}</p>
                    </div>
                    <RoleBadge role={data.student.classRole} />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 p-4 border rounded-lg bg-white shadow-sm space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Giới tính</label>
                    <Select value={editGender} onValueChange={setEditGender}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Nam</SelectItem>
                        <SelectItem value="FEMALE">Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chọn ảnh đại diện</label>
                    <div className="flex flex-wrap gap-3">
                      {AVATAR_OPTIONS.map((av) => (
                        <button
                          key={av}
                          onClick={() => setEditAvatar(av)}
                          className={`w-14 h-14 relative rounded-full border-2 overflow-hidden transition-all ${
                            editAvatar === av ? 'border-blue-600 ring-2 ring-blue-200 scale-110' : 'border-transparent hover:scale-105'
                          }`}
                        >
                          <Image src={av} alt="avatar option" fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Hủy</Button>
                    <Button 
                      size="sm" 
                      onClick={() => updateMutation.mutate({ gender: editGender, avatar: editAvatar })}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-red-50 px-3 py-2">
                  <p className="text-[11px] font-medium text-red-700">Tổng vi phạm</p>
                  <p className="text-base font-bold text-red-800">
                    {formatVND(data.student.violationTotal)}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-2">
                  <p className="text-[11px] font-medium text-amber-700">Số lần vi phạm</p>
                  <p className="text-base font-bold text-amber-800">{data.student.violationCount}</p>
                </div>
                <div className="rounded-lg bg-blue-50 px-3 py-2">
                  <p className="text-[11px] font-medium text-blue-700">Tổng tiền đã nộp</p>
                  <p className="text-base font-bold text-blue-800">
                    {formatVND(data.student.paidTotal ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-orange-50 px-3 py-2">
                  <p className="text-[11px] font-medium text-orange-700">Tiền còn phải nộp</p>
                  <p className="text-base font-bold text-orange-800">
                    {formatVND(
                      Math.max(0, data.student.violationTotal - (data.student.paidTotal ?? 0))
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={data.student.status} />
                <span>Tham gia lớp: {formatDate(data.student.joinedAt)}</span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold">Lịch sử vi phạm</p>
              </div>
              {data.violations.length === 0 ? (
                <div className="flex flex-col items-center rounded-lg border border-dashed py-6 text-muted-foreground">
                  <Inbox className="h-5 w-5" />
                  <p className="mt-1 text-sm">Chưa có vi phạm nào</p>
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {data.violations.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{v.violationType.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(v.createdAt)}
                          {v.note ? ` — ${v.note}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-red-700">
                        −{new Intl.NumberFormat('vi-VN').format(v.amount)}đ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Separator />
            <p className="text-center text-xs text-muted-foreground">
              Vi phạm chỉ trở thành tiền quỹ khi thủ quỹ ghi nhận đã thu.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
