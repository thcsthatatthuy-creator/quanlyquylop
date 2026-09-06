'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/client'
import { formatVND } from '@/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StudentRow, ViolationTypeRow } from '@/components/views/teacher/tabs/use-class-data'
import { toast } from 'sonner'
import { ArrowLeft, ChevronUp, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  classId: string
  students: StudentRow[]
  allStudents: StudentRow[]
  types: ViolationTypeRow[]
  onCreated: () => void
  onClose: () => void
}

const getIconForViolation = (name: string, fallback: string | null): string => {
  const lower = name.toLowerCase()
  if (lower.includes('mu\u1ed9n') || lower.includes('tr\u1ec5') || lower.includes('late')) return '/icons/late.jpg'
  if (lower.includes('b\u00e0i') || lower.includes('homework')) return '/icons/homework.jpg'
  if (lower.includes('ng\u1ee7') || lower.includes('sleep')) return '/icons/sleep.jpg'
  return fallback || '/icons/late.jpg'
}

export function ViolationActionView({
  classId,
  students,
  allStudents,
  types,
  onCreated,
  onClose,
}: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lastUndo, setLastUndo] = useState<{ label: string; execute: () => Promise<void> } | null>(null)

  useEffect(() => {
    if (students.length === 1 && allStudents.length > 0) {
      const idx = allStudents.findIndex(s => s.userId === students[0].userId)
      if (idx !== -1) setCurrentIndex(idx)
    }
  }, [students, allStudents])

  if (!students || students.length === 0) return null

  const isMulti = students.length > 1
  const currentStudent = isMulti ? null : (allStudents[currentIndex] || students[0])
  const targetStudents = isMulti ? students : [currentStudent!]
  const activeTypes = types.filter(t => t.active)

  async function addViolation(type: ViolationTypeRow) {
    setLoadingId(type.id)
    try {
      const results = await Promise.all(
        targetStudents.map(student =>
          apiFetch(`/api/classes/${classId}/violations`, {
            method: 'POST',
            json: {
              studentId: student.userId,
              violationTypeId: type.id,
              amount: type.amount,
              date: new Date().toISOString().slice(0, 10),
              note: '',
            },
          })
        )
      )
      const msg = isMulti
        ? `Đã thêm: ${type.name} cho ${targetStudents.length} học sinh`
        : `Đã thêm: ${type.name} cho ${targetStudents[0]?.fullName}`
      const undoFn = async () => {
        try {
          await Promise.all(results.map((res: any) =>
            apiFetch(`/api/violations/${res.violation.id}`, { method: 'DELETE' })
          ))
          toast.success('Đã hoàn tác!')
          setLastUndo(null)
          onCreated()
        } catch {
          toast.error('Hoàn tác thất bại.')
        }
      }

      toast.success(msg, {
        action: {
          label: 'Hoàn tác',
          onClick: undoFn
        }
      })
      
      setLastUndo({
        label: msg,
        execute: undoFn
      })
      
      onCreated()
      if (isMulti) onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thêm vi phạm thất bại.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="flex flex-col md:flex-row w-full gap-0 min-h-[calc(100vh-220px)] rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">

      {/* === LEFT PANEL === */}
      <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* Back button */}
        <div className="p-4 border-b border-slate-100">
          <Button variant="ghost" onClick={onClose} className="gap-2 text-slate-600 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Trở về danh sách
          </Button>
        </div>

        {isMulti ? (
          <div className="flex-1 flex flex-col p-5">
            <div className="text-center mb-5">
              <div className="text-2xl font-bold text-slate-800">Chọn nhiều học sinh</div>
              <p className="text-sm text-slate-500 mt-1">Vi phạm áp dụng cho <span className="font-bold text-blue-600">{students.length}</span> học sinh</p>
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2 content-start pb-4">
              {students.map(s => (
                <div key={s.userId} className="flex flex-col items-center p-2 border border-blue-100 rounded-xl bg-blue-50 relative">
                  <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white z-10">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <Avatar className="w-10 h-10 mb-1 border-2 border-white shadow">
                    <AvatarImage src={s.avatar || '/avatars/boy.jpg'} alt={s.fullName} className="object-cover" />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-sm">{s.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold text-center line-clamp-2 leading-tight">{s.fullName}</span>
                </div>
              ))}
            </div>
          </div>
        ) : currentStudent ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            {/* Navigation */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
              <Button
                variant="outline" size="icon"
                className="rounded-full w-10 h-10 shadow border-slate-200 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-30"
                disabled={currentIndex <= 0}
                onClick={() => setCurrentIndex(i => i - 1)}
              >
                <ChevronUp className="w-5 h-5" />
              </Button>
              <Button
                variant="outline" size="icon"
                className="rounded-full w-10 h-10 shadow border-slate-200 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-30"
                disabled={currentIndex >= allStudents.length - 1}
                onClick={() => setCurrentIndex(i => i + 1)}
              >
                <ChevronDown className="w-5 h-5" />
              </Button>
            </div>

            {/* Counter */}
            <p className="text-xs text-slate-400 font-medium mb-4 bg-slate-100 px-3 py-1 rounded-full">
              {currentIndex + 1} / {allStudents.length}
            </p>

            {/* Avatar */}
            <div className="relative mb-5">
              <div className="w-44 h-44 rounded-full border-4 border-dashed border-red-400 p-2 bg-white flex items-center justify-center">
                <Avatar className="w-full h-full rounded-full">
                  <AvatarImage src={currentStudent.avatar || '/avatars/boy.jpg'} alt={currentStudent.fullName} className="object-cover" />
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-4xl">{currentStudent.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              {/* Violation count badge */}
              <div className="absolute -top-2 -left-2 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-base border-4 border-white shadow-md">
                {currentStudent.violationCount ?? 0}
              </div>
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-4 border-white shadow-md leading-tight text-center px-1">
                {currentStudent.violationTotal > 0 ? (currentStudent.violationTotal / 1000).toFixed(0) + 'k' : '0'}
              </div>
            </div>

            {/* Name */}
            <h3 className="text-xl font-bold text-slate-800 text-center mb-1 px-8">{currentStudent.fullName}</h3>
            <p className="text-sm text-red-500 font-semibold mb-6">
              Tổng phạt: {formatVND(currentStudent.violationTotal)}
            </p>

            {/* View violations button */}
            <Button
              variant="outline"
              className="rounded-full border-2 border-red-400 text-red-500 hover:bg-red-50 font-semibold px-8"
              onClick={() => toast.info('Xem hồ sơ trong tab Học sinh')}
            >
              Xem Lịch sử Vi phạm
            </Button>
          </div>
        ) : null}
      </div>

      {/* === RIGHT PANEL === */}
      <div className="flex-1 flex flex-col bg-[#f4f6fb] min-h-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-white font-bold text-xl tracking-wide">GHI NHẬN VI PHẠM</h2>
            <p className="text-blue-200 text-sm mt-0.5">Chọn tiêu chí để áp dụng</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm text-white font-bold px-5 py-2 rounded-full text-sm border border-white/30">
            ĐIỂM TRỪ
          </div>
        </div>

        {/* Violation types grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <AlertCircle className="w-12 h-12 opacity-30" />
              <p className="font-semibold">Chưa có loại vi phạm nào</p>
              <p className="text-sm text-center">Thêm loại vi phạm trong mục "Danh mục vi phạm" phía trên.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {activeTypes.map(type => {
                const iconSrc = getIconForViolation(type.name, type.icon)
                const val = (type.amount / 1000).toString()
                const isLoading = loadingId === type.id

                return (
                  <button
                    key={type.id}
                    disabled={loadingId !== null}
                    onClick={() => addViolation(type)}
                    className="group flex flex-col items-center gap-3 outline-none disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    <div className="relative w-full">
                      <div className="w-full aspect-square rounded-[30%] bg-white border-[3px] border-amber-400 shadow-md group-hover:shadow-lg group-hover:border-amber-500 transition-all overflow-hidden flex items-center justify-center p-2 relative">
                        <img src={iconSrc} alt={type.name} className="w-full h-full object-contain" />
                        {isLoading && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-sm rounded-[27%]">
                            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -top-3 -right-3 bg-red-500 text-white text-sm font-bold w-10 h-10 rounded-full border-[3px] border-white shadow-md flex items-center justify-center z-10">
                        -{val}
                      </div>
                    </div>
                    <span className="font-bold text-slate-700 text-center text-sm leading-tight px-1 line-clamp-2">{type.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer note & Undo */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Nhấn vào tiêu chí để ghi nhận.
          </p>
          {lastUndo && (
            <Button 
              variant="outline" 
              className="border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold shadow-sm"
              onClick={lastUndo.execute}
            >
              Hoàn tác: {lastUndo.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
