'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { apiFetch } from '@/lib/client'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { formatVND } from '@/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StudentRow, ViolationTypeRow } from '@/components/views/teacher/tabs/use-class-data'
import { Loader2, ArrowLeft, ChevronUp, ChevronDown, Check } from 'lucide-react'

export function ViolationActionModal({
  open,
  onClose,
  classId,
  students,
  allStudents,
  types,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  classId: string
  students: StudentRow[]
  allStudents: StudentRow[]
  types: ViolationTypeRow[]
  onCreated: () => void
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Reset index when modal opens with a single student
  useEffect(() => {
    if (open && students.length === 1 && allStudents.length > 0) {
      const idx = allStudents.findIndex(s => s.userId === students[0].userId)
      if (idx !== -1) setCurrentIndex(idx)
    }
  }, [open, students, allStudents])

  if (!students || students.length === 0) return null

  const isMulti = students.length > 1
  const currentStudent = isMulti ? null : allStudents[currentIndex] || students[0]
  const targetStudents = isMulti ? students : [currentStudent]

  const activeTypes = types.filter((t) => t.active)

  async function addViolation(type: ViolationTypeRow) {
    setLoadingId(type.id)
    try {
      const results = await Promise.all(targetStudents.map(async (student) => {
        return apiFetch(`/api/classes/${classId}/violations`, {
          method: 'POST',
          json: {
            studentId: student.userId,
            violationTypeId: type.id,
            amount: type.amount,
            date: new Date().toISOString().slice(0, 10),
            note: '',
          },
        })
      }))
      
      const isMultiple = targetStudents.length > 1
      const message = isMultiple 
        ? `Đã thêm: ${type.name} cho ${targetStudents.length} học sinh` 
        : `Đã thêm: ${type.name} cho ${targetStudents[0]?.fullName}`

      toast.success(message, {
        action: {
          label: 'Hoàn tác',
          onClick: async () => {
            try {
              await Promise.all(results.map((res: any) => 
                apiFetch(`/api/violations/${res.violation.id}`, { method: 'DELETE' })
              ))
              toast.success('Đã hoàn tác!')
              onCreated()
            } catch (err) {
              toast.error('Hoàn tác thất bại.')
            }
          }
        }
      })
      onCreated()
      if (isMultiple) {
        onClose()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thêm vi phạm thất bại.')
    } finally {
      setLoadingId(null)
    }
  }

  const getIconForViolation = (name: string, fallbackIcon: string | null) => {
    const lower = name.toLowerCase();
    if (lower.includes('muộn')) return '/icons/late.jpg';
    if (lower.includes('bài tập')) return '/icons/homework.jpg';
    if (lower.includes('ngủ')) return '/icons/sleep.jpg';
    return '/icons/late.jpg';
  }

  const handleNext = () => {
    if (currentIndex < allStudents.length - 1) setCurrentIndex(currentIndex + 1)
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[1100px] w-[95vw] p-0 bg-transparent border-none shadow-none overflow-hidden [&>button]:hidden">
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>Ghi nhận vi phạm</DialogTitle>
            <DialogDescription>Chọn tiêu chí vi phạm để áp dụng.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col md:flex-row w-full bg-[#f8f9fa] rounded-[2rem] overflow-hidden shadow-2xl relative max-h-[90vh]">
          
          <button 
            onClick={onClose}
            className="absolute top-6 left-6 z-50 rounded-full bg-white shadow-md hover:bg-slate-100 p-3 transition-colors text-slate-700 flex items-center gap-2 font-bold"
          >
            <ArrowLeft className="w-5 h-5" /> Trở về
          </button>

          {/* Left Column (Student Info) */}
          <div className="w-full md:w-[380px] shrink-0 bg-white p-6 pt-24 flex flex-col items-center md:rounded-r-none rounded-b-none shadow-[4px_0_24px_rgba(0,0,0,0.05)] z-10 overflow-y-auto">
            {isMulti ? (
              <div className="w-full h-full flex flex-col">
                <h3 className="text-2xl font-bold mb-2 text-gray-800 text-center">Đang chọn {students.length} học sinh</h3>
                <p className="text-muted-foreground text-center mb-6">Vi phạm sẽ được áp dụng cho tất cả học sinh dưới đây.</p>
                <div className="flex-1 overflow-y-auto w-full grid grid-cols-2 gap-3 pb-6 px-2">
                  {students.map(s => (
                    <div key={s.userId} className="flex flex-col items-center p-3 border border-blue-100 rounded-xl bg-slate-50 relative">
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 border-2 border-white">
                        <Check className="w-3 h-3" />
                      </div>
                      <Avatar className="w-12 h-12 mb-2 border-2 border-white shadow-sm">
                        <AvatarImage src={s.avatar || '/avatars/boy.jpg'} alt={s.fullName} className="object-cover" />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">{s.fullName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-center line-clamp-2">{s.fullName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative pb-10">
                {/* Navigation Arrows */}
                <div className="absolute right-0 flex flex-col gap-3 top-1/2 -translate-y-1/2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full shadow-sm w-12 h-12 disabled:opacity-30 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                    disabled={currentIndex <= 0}
                    onClick={handlePrev}
                  >
                    <ChevronUp className="w-6 h-6" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full shadow-sm w-12 h-12 disabled:opacity-30 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                    disabled={currentIndex >= allStudents.length - 1}
                    onClick={handleNext}
                  >
                    <ChevronDown className="w-6 h-6" />
                  </Button>
                </div>

                <h3 className="text-3xl font-bold mb-10 text-gray-800 text-center px-12">{currentStudent.fullName}</h3>
                
                <div className="relative mb-12 w-full flex justify-center">
                  <div className="w-[220px] h-[220px] rounded-full border-[4px] border-dashed border-[#e11d48] p-2 relative flex items-center justify-center bg-white">
                    <Avatar className="w-full h-full rounded-full">
                      <AvatarImage src={currentStudent.avatar || '/avatars/boy.jpg'} alt={currentStudent.fullName} className="object-cover" />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-5xl">
                        {currentStudent.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="absolute top-6 -left-4 w-14 h-14 bg-[#e11d48] rounded-full flex items-center justify-center text-white font-bold text-xl border-4 border-white shadow-md z-20">
                      0
                    </div>
                    
                    <div className="absolute top-6 -right-4 w-14 h-14 bg-[#e11d48] rounded-full flex items-center justify-center text-white font-bold text-xl border-4 border-white shadow-md z-20">
                      0
                    </div>
                  </div>
                </div>
                
                <Button variant="outline" className="w-[70%] rounded-full border-[#e11d48] text-[#e11d48] hover:bg-red-50 hover:text-red-600 font-bold text-lg h-14 shadow-sm" onClick={() => window.alert('Tính năng đang phát triển')}>
                  Xem Danh Sách
                </Button>
              </div>
            )}
          </div>

          {/* Right Column (Actions) */}
          <div className="flex-1 flex flex-col p-6 lg:p-8 bg-[#f8f9fa] overflow-hidden">
            <div className="bg-[#1877f2] rounded-3xl p-4 flex justify-center items-center shadow-md mb-8 h-[100px] shrink-0">
              <div className="bg-[#4c1d95] text-white px-16 py-4 rounded-full font-bold shadow-sm text-xl tracking-wider">
                ĐIỂM TRỪ
              </div>
            </div>
            
            <div className="bg-white rounded-[2rem] p-8 shadow-sm flex-1 flex flex-col overflow-hidden border border-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 mb-auto flex-1 overflow-y-auto p-4 pb-12 items-start content-start">
                {activeTypes.length === 0 ? (
                  <div className="col-span-full text-center p-8 text-muted-foreground text-lg">
                    Chưa có danh mục vi phạm nào.
                  </div>
                ) : activeTypes.map((type) => {
                  const iconSrc = getIconForViolation(type.name, type.icon)
                  const formattedValue = (type.amount / 1000).toString() 

                  return (
                    <button 
                      key={type.id}
                      disabled={loadingId !== null}
                      onClick={() => addViolation(type)}
                      className="flex flex-col items-center gap-5 group relative outline-none hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      <div className="relative">
                        <div className="w-[120px] h-[120px] rounded-[35%] bg-white border-[4px] border-[#fbbf24] shadow-md group-hover:scale-105 group-hover:shadow-lg transition-all overflow-hidden flex items-center justify-center p-2 relative">
                           <img src={iconSrc} alt={type.name} className="w-full h-full object-contain" />
                           {loadingId === type.id && (
                             <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                               <Loader2 className="h-10 w-10 animate-spin text-red-600" />
                             </div>
                           )}
                        </div>
                        <div className="absolute -top-3 -right-3 bg-[#e11d48] text-white text-lg font-bold w-12 h-12 rounded-full border-[3px] border-white shadow-md flex items-center justify-center z-10">
                          -{formattedValue}
                        </div>
                      </div>
                      <span className="font-bold text-slate-800 text-center text-lg leading-tight px-2">{type.name}</span>
                    </button>
                  )
                })}
              </div>
              
              <div className="flex items-center justify-center gap-4 border-t border-slate-100 pt-6 mt-4 shrink-0">
                <Switch id="custom-violation" className="data-[state=checked]:bg-[#1877f2]" /> 
                <label htmlFor="custom-violation" className="text-slate-600 font-bold text-base cursor-pointer select-none">
                  Điểm Thưởng / Điểm Trừ đột xuất
                </label>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
