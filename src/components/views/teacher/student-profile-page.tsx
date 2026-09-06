'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { formatVND, formatDate, formatDateTime } from '@/lib/format'
import { RoleBadge, StatusBadge } from '@/components/shared/badges'
import { LoadingBlock, ErrorState } from '@/components/shared/ui-bits'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  ArrowLeft, AlertTriangle, Inbox, Edit2, Save, X,
  Mail, Calendar, TrendingDown, Wallet, BadgeAlert, CheckCircle2,
} from 'lucide-react'

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
    paidTotal?: number
  }
  violations: {
    id: string
    amount: number
    note: string | null
    createdAt: string
    violationType: { name: string }
  }[]
}

const AVATAR_OPTIONS = {
  Nam: [
    { src: '/avatars/boy.jpg', label: 'Nam 1' },
    { src: '/avatars/boy2.jpg', label: 'Nam 2' },
    { src: '/avatars/boy3.jpg', label: 'Nam 3' },
    { src: '/avatars/boy4.jpg', label: 'Nam 4' },
  ],
  Nữ: [
    { src: '/avatars/girl.jpg', label: 'Nữ 1' },
    { src: '/avatars/girl2.jpg', label: 'Nữ 2' },
    { src: '/avatars/girl3.jpg', label: 'Nữ 3' },
    { src: '/avatars/girl4.jpg', label: 'Nữ 4' },
  ]
}

export function StudentProfilePage({
  classId, userId, isManager, onBack,
}: {
  classId: string
  userId: string
  isManager: boolean
  onBack: () => void
}) {
  const qc = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editGender, setEditGender] = useState('Nam')
  const [editAvatar, setEditAvatar] = useState(AVATAR_OPTIONS.Nam[0].src)

  const { data, isLoading, error, refetch } = useQuery<ProfileData>({
    queryKey: ['student-profile', classId, userId],
    queryFn: () => apiFetch(`/api/classes/${classId}/students/${userId}/profile`),
    enabled: !!classId && !!userId,
  })

  useEffect(() => {
    if (data?.student) {
      const g = data.student.gender === 'Nữ' ? 'Nữ' : 'Nam'
      setEditGender(g)
      setEditAvatar(data.student.avatar || AVATAR_OPTIONS[g as 'Nam'|'Nữ'][0].src)
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (v: { gender: string; avatar: string }) =>
      apiFetch(`/api/classes/${classId}/students/${userId}/profile`, { method: 'PATCH', json: v }),
    onSuccess: () => {
      toast.success('Đã cập nhật hồ sơ!')
      setIsEditing(false)
      qc.invalidateQueries({ queryKey: ['student-profile', classId, userId] })
      qc.invalidateQueries({ queryKey: ['class-students', classId] })
    },
    onError: (e) => toast.error((e as Error).message),
  })

  if (isLoading) return <LoadingBlock />
  if (error || !data) return <ErrorState message={(error as Error)?.message ?? 'Không tìm thấy.'} onRetry={refetch} />

  const { student, violations } = data
  const remaining = Math.max(0, student.violationTotal - (student.paidTotal ?? 0))
  const avatarSrc = isEditing ? editAvatar : (student.avatar || (student.gender === 'Nữ' ? AVATAR_OPTIONS.Nữ[0].src : AVATAR_OPTIONS.Nam[0].src))

  return (
    <div className="min-h-full pb-8">
      <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2 gap-1.5 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Danh sách học sinh
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700" />
            <div className="px-5 pb-5 -mt-12">
              <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100 mb-3">
                <Image src={avatarSrc} alt={student.fullName} fill className="object-cover" />
              </div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{student.fullName}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm text-slate-500">{student.gender === 'Nữ' ? 'Nữ' : 'Nam'}</span>
                    <RoleBadge role={student.classRole} />
                  </div>
                </div>
                <StatusBadge status={student.status} />
              </div>

              <div className="space-y-1.5 text-sm text-slate-500 mb-4">
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{student.email}</span></div>
                <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 shrink-0" /><span>Vào lớp: {formatDate(student.joinedAt)}</span></div>
              </div>

              {isManager && !isEditing && (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-3.5 w-3.5" /> Chỉnh sửa hồ sơ
                </Button>
              )}

              {isManager && isEditing && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Chỉnh sửa hồ sơ</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Giới tính</label>
                    <Select value={editGender} onValueChange={(v) => {
                      setEditGender(v)
                      if (v === 'Nữ' && !AVATAR_OPTIONS.Nữ.some(a => a.src === editAvatar)) setEditAvatar(AVATAR_OPTIONS.Nữ[0].src)
                      if (v === 'Nam' && !AVATAR_OPTIONS.Nam.some(a => a.src === editAvatar)) setEditAvatar(AVATAR_OPTIONS.Nam[0].src)
                    }}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nam">Nam</SelectItem>
                        <SelectItem value="Nữ">Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-2 block">Ảnh đại diện</label>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATAR_OPTIONS[editGender as 'Nam'|'Nữ'].map((av) => (
                        <button
                          key={av.src}
                          type="button"
                          onClick={() => setEditAvatar(av.src)}
                          className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            editAvatar === av.src
                              ? 'border-blue-500 ring-2 ring-blue-100 scale-105 shadow-md'
                              : 'border-slate-200 hover:border-blue-300 hover:scale-105'
                          }`}
                        >
                          <Image src={av.src} alt={av.label} fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setIsEditing(false); setEditGender(student.gender || 'MALE'); setEditAvatar(student.avatar || AVATAR_OPTIONS[0].src) }}>
                      <X className="h-3.5 w-3.5 mr-1" /> Hủy
                    </Button>
                    <Button size="sm" className="flex-1" disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ gender: editGender, avatar: editAvatar })}>
                      <Save className="h-3.5 w-3.5 mr-1" />{updateMutation.isPending ? 'Lưu...' : 'Lưu'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-red-50 border border-red-100 p-3">
              <div className="flex items-center gap-1 text-red-500 mb-1"><TrendingDown className="h-3.5 w-3.5" /><span className="text-xs font-semibold">Tổng vi phạm</span></div>
              <p className="text-xl font-bold text-red-700">{formatVND(student.violationTotal)}</p>
              <p className="text-xs text-red-400">{student.violationCount} lần</p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <div className="flex items-center gap-1 text-blue-500 mb-1"><Wallet className="h-3.5 w-3.5" /><span className="text-xs font-semibold">Đã nộp</span></div>
              <p className="text-xl font-bold text-blue-700">{formatVND(student.paidTotal ?? 0)}</p>
            </div>
            <div className={`col-span-2 rounded-xl border p-3 ${remaining > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
              <div className={`flex items-center gap-1 mb-1 ${remaining > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                {remaining > 0 ? <BadgeAlert className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span className="text-xs font-semibold">{remaining > 0 ? 'Còn phải nộp' : 'Đã nộp đủ'}</span>
              </div>
              <p className={`text-xl font-bold ${remaining > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                {remaining > 0 ? formatVND(remaining) : 'Không còn nợ'}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-slate-700">Lịch sử vi phạm</h3>
              {violations.length > 0 && (
                <span className="ml-auto rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600">{violations.length} lần</span>
              )}
            </div>
            {violations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <Inbox className="h-12 w-12 mb-3" />
                <p className="font-semibold text-slate-400">Chưa có vi phạm nào</p>
                <p className="text-sm mt-1">Học sinh này chưa bị ghi nhận vi phạm.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-50">
                  {violations.map((v, i) => (
                    <div key={v.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{v.violationType.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDateTime(v.createdAt)}
                          {v.note && <span className="ml-2 italic text-slate-500">"{v.note}"</span>}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-base font-bold text-red-600">-{new Intl.NumberFormat('vi-VN').format(v.amount)}d</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-6 py-3 bg-slate-50 rounded-b-2xl border-t border-slate-100">
                  <span className="text-xs text-slate-400">Tiền phạt từ vi phạm được tự động cộng vào quỹ lớp.</span>
                  <span className="font-bold text-red-600 text-sm">Tổng: -{new Intl.NumberFormat('vi-VN').format(student.violationTotal)}đ</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
