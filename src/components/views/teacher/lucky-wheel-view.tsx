'use client'

import React, { useEffect, useState, useRef } from 'react'
import { apiFetch } from '@/lib/client'
import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorState, LoadingBlock } from '@/components/shared/ui-bits'
import { Loader2, Users, Trophy } from 'lucide-react'
import confetti from 'canvas-confetti'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

// Professional, clean colors
const VIBRANT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#84cc16', // lime
]

interface ClassObj {
  id: string
  name: string
  schoolName: string
}
interface Student {
  id: string
  fullName: string
}

export function LuckyWheelView() {
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  
  const { data: classesData, isLoading: isClassesLoading, error: classesError } = useQuery<{classes: ClassObj[]}>({
    queryKey: ['classes'],
    queryFn: () => apiFetch('/api/classes')
  })
  const classes = classesData?.classes

  useEffect(() => {
    if (classes && classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id)
    }
  }, [classes, selectedClassId])

  const { data: studentsData, isLoading: isStudentsLoading, error: studentsError } = useQuery<{students: Student[]}>({
    queryKey: ['classes', selectedClassId, 'students'],
    queryFn: () => apiFetch(`/api/classes/${selectedClassId}/students?pageSize=500`),
    enabled: !!selectedClassId
  })
  const students = studentsData?.students

  const [customList, setCustomList] = useState<string>('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [winner, setWinner] = useState<string | null>(null)
  const [showWinner, setShowWinner] = useState(false)
  
  const wheelRef = useRef<SVGGElement>(null)

  useEffect(() => {
    if (students) {
      const names = students.map(s => {
        const parts = s.fullName.trim().split(' ')
        if (parts.length <= 1) return s.fullName
        return parts.slice(-2).join(' ')
      })
      setCustomList(names.join('\n'))
    }
  }, [students, selectedClassId])

  const names = customList.split('\n').map(n => n.trim()).filter(n => n !== "")
  const numSlices = names.length

  const handleSpin = () => {
    if (numSlices === 0 || isSpinning) return

    setIsSpinning(true)
    setWinner(null)
    setShowWinner(false)
    
    const winnerIndex = Math.floor(Math.random() * numSlices)
    const winningName = names[winnerIndex]

    const sliceAngle = 360 / numSlices
    const sliceCenter = winnerIndex * sliceAngle + sliceAngle / 2
    
    const extraSpins = 8
    const baseRotation = (270 - sliceCenter) + (extraSpins * 360)
    
    const currentRotMod = rotation % 360
    let targetRotation = rotation - currentRotMod + baseRotation
    
    if (targetRotation <= rotation) {
        targetRotation += 360
    }

    setRotation(targetRotation)

    setTimeout(() => {
      setIsSpinning(false)
      setWinner(winningName)
      setShowWinner(true)
      
      const end = Date.now() + 3 * 1000
      const colors = ['#bb0000', '#ffffff', '#0000bb', '#00bb00', '#ffff00']
      
      ;(function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        })
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        })
      
        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }())

    }, 8000)
  }

  const renderSlicesSimplerText = () => {
    if (numSlices === 0) return null
    const sliceAngle = 360 / numSlices
    const hideText = numSlices > 40

    return names.map((name, i) => {
      const startAngle = i * sliceAngle
      const endAngle = startAngle + sliceAngle
      
      const r = 50
      const cx = 50
      const cy = 50
      
      const startRad = (startAngle) * (Math.PI / 180)
      const endRad = (endAngle) * (Math.PI / 180)
      
      const x1 = cx + r * Math.cos(startRad)
      const y1 = cy + r * Math.sin(startRad)
      const x2 = cx + r * Math.cos(endRad)
      const y2 = cy + r * Math.sin(endRad)
      
      const largeArc = sliceAngle > 180 ? 1 : 0
      
      const d = `
        M ${cx} ${cy}
        L ${x1} ${y1}
        A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}
        Z
      `
      
      const color = VIBRANT_COLORS[i % VIBRANT_COLORS.length]
      const midAngle = startAngle + sliceAngle / 2
      
      const maxFontSize = 4.5
      const minFontSize = 1.8
      const calculatedSize = Math.max(minFontSize, Math.min(maxFontSize, sliceAngle * 0.35))
      
      return (
        <g key={i}>
          <path d={d} fill={color} stroke="#ffffff" strokeWidth={numSlices > 30 ? "0.2" : "0.5"} />
          {!hideText && (
            <g transform={`translate(${cx}, ${cy}) rotate(${midAngle})`}>
              <text 
                x="46"
                y="0" 
                fill="#ffffff"
                fontSize={calculatedSize}
                fontWeight="600"
                fontFamily="sans-serif"
                textAnchor="end"
                dominantBaseline="central"
                style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
              >
                {name}
              </text>
            </g>
          )}
        </g>
      )
    })
  }

  if (isClassesLoading) return <LoadingBlock />
  if (classesError) return <ErrorState onRetry={() => window.location.reload()} />
  
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6 sm:pb-20">
      
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
        <div className="text-center sm:text-left w-full sm:w-auto">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800">
            Vòng Quay May Mắn
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Chọn kết quả ngẫu nhiên cho lớp học của bạn
          </p>
        </div>
        
        <div className="w-full sm:w-64 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={isSpinning}>
            <SelectTrigger className="border-0 shadow-none font-medium h-10 text-sm">
              <SelectValue placeholder="Chọn lớp học" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-sm">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-4 sm:p-8">
          
          {isStudentsLoading && (
            <div className="py-20 flex justify-center">
               <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}
          
          {studentsError && (
            <div className="py-10 text-center text-red-500 font-medium">
                Lỗi tải danh sách học sinh. Vui lòng thử lại.
            </div>
          )}

          {!isStudentsLoading && !studentsError && (
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center justify-center py-4">
              
              {/* Wheel Container */}
              <div className="relative w-full max-w-[320px] sm:max-w-[420px] lg:max-w-[480px] aspect-square flex items-center justify-center">
                
                {/* Clean Rim */}
                <div className="absolute inset-0 rounded-full border-[10px] sm:border-[12px] border-amber-400 shadow-sm bg-white z-0 overflow-hidden">
                  {numSlices > 0 ? (
                    <svg 
                      viewBox="0 0 100 100" 
                      className="w-full h-full relative z-10"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: isSpinning ? 'transform 8s cubic-bezier(0.15, 0, 0, 1)' : 'none',
                      }}
                      ref={wheelRef}
                    >
                      <g>
                        {renderSlicesSimplerText()}
                      </g>
                    </svg>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-6 text-center">
                      <Users className="w-12 h-12 mb-2 opacity-20" />
                      <p className="text-sm font-medium">Nhập tên vào danh sách để bắt đầu quay</p>
                    </div>
                  )}
                </div>

                {/* Pointer / Arrow */}
                <div 
                  className="absolute z-30 drop-shadow-md" 
                  style={{
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round">
                    <path d="M12 2L22 22H2L12 2Z" transform="rotate(180 12 12)" />
                  </svg>
                </div>

                {/* Center Spin Button */}
                <button 
                  onClick={handleSpin}
                  disabled={isSpinning || numSlices === 0}
                  className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-24 sm:h-24 -ml-10 -mt-10 sm:-ml-12 sm:-mt-12 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg border-[4px] border-white z-20 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                   <span className="text-white font-bold text-lg sm:text-xl uppercase tracking-widest">
                      Quay
                   </span>
                </button>

              </div>

              {/* Right Side: Custom List Controls */}
              <div className="flex flex-col bg-white p-5 sm:p-6 rounded-2xl w-full lg:w-80 shadow-sm border border-slate-200 h-[420px] sm:h-[480px]">
                <div className="flex justify-between items-center mb-4">
                  <div className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                    Danh sách 
                    <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      {numSlices}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-slate-500 mb-3">
                  Bạn có thể thêm hoặc xoá nội dung, mỗi mục 1 dòng.
                </p>

                <Textarea 
                  value={customList}
                  onChange={(e) => setCustomList(e.target.value)}
                  disabled={isSpinning}
                  className="w-full flex-1 p-3 rounded-lg border border-slate-200 resize-none outline-none focus-visible:ring-1 focus-visible:ring-blue-500 text-sm text-slate-700 disabled:opacity-50"
                  placeholder="Nhập nội dung vào đây..."
                />

                {numSlices > 40 && !isSpinning && (
                  <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg text-center font-medium border border-blue-100 mt-4">
                    Danh sách dài sẽ được ẩn bớt chữ trên vòng quay.
                  </p>
                )}
                
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      {/* Winner Modal */}
      <Dialog open={showWinner} onOpenChange={setShowWinner}>
        <DialogContent className="sm:max-w-md mx-auto border border-slate-200 bg-white p-8 rounded-2xl shadow-lg">
          <div className="flex flex-col items-center text-center">
             
            <div className="bg-blue-50 text-blue-600 p-5 rounded-full mb-6">
               <Trophy className="w-12 h-12" />
            </div>
            
            <DialogTitle className="text-sm text-slate-500 font-semibold mb-2 uppercase tracking-widest">
                Kết quả quay
            </DialogTitle>
            
            <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">
               {winner}
            </div>
            
            <Button 
                onClick={() => setShowWinner(false)}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 font-medium rounded-xl h-12 text-base"
            >
                Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
