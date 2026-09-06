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

// A set of vibrant, modern colors for the wheel
const VIBRANT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
]

function getShortName(fullName: string) {
  const parts = fullName.trim().split(' ')
  if (parts.length <= 1) return fullName
  return parts.slice(-2).join(' ')
}

// Fetch interfaces
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

  // Set default class if available
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

  // Wheel State
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0) // Tracks current visual rotation
  const [winner, setWinner] = useState<Student | null>(null)
  const [showWinner, setShowWinner] = useState(false)
  
  const wheelRef = useRef<SVGGElement>(null)

  // Map to short names (Middle + First) to prevent overlapping in the center
  const names = students ? students.map(s => getShortName(s.fullName)) : []
  const numSlices = names.length

  const handleSpin = () => {
    if (numSlices === 0 || isSpinning) return

    setIsSpinning(true)
    setWinner(null)
    setShowWinner(false)
    
    // 1. Pick a random winner index
    const winnerIndex = Math.floor(Math.random() * numSlices)
    const winningStudent = students![winnerIndex]

    const sliceAngle = 360 / numSlices
    // Angle to the center of the winning slice
    const sliceCenter = winnerIndex * sliceAngle + sliceAngle / 2

    // Pointer is at the TOP (270 degrees in SVG rotation, or -90 deg from right X-axis)
    // We want (sliceCenter + R) % 360 === 270
    
    const extraSpins = 8 // Spin 8 full times for longer animation
    const baseRotation = (270 - sliceCenter) + (extraSpins * 360)
    
    const currentRotMod = rotation % 360
    let targetRotation = rotation - currentRotMod + baseRotation
    
    if (targetRotation <= rotation) {
        targetRotation += 360
    }

    setRotation(targetRotation)

    // Wait for the CSS transition to finish (8 seconds)
    setTimeout(() => {
      setIsSpinning(false)
      setWinner(winningStudent)
      setShowWinner(true)
      
      // Fire confetti
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

  // Draw the SVG paths for the wheel slices
  const renderSlicesSimplerText = () => {
    if (numSlices === 0) return null
    const sliceAngle = 360 / numSlices
    const hideText = numSlices > 25

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
      
      // Calculate font size dynamically based on slice angle
      const maxFontSize = 4.5
      const minFontSize = 1.8
      const calculatedSize = Math.max(minFontSize, Math.min(maxFontSize, sliceAngle * 0.35))
      
      return (
        <g key={i}>
          <path d={d} fill={color} stroke="#ffffff" strokeWidth={numSlices > 30 ? "0.2" : "0.5"} />
          {!hideText && (
            <g transform={`translate(${cx}, ${cy}) rotate(${midAngle})`}>
              <text 
                x="46" // Start near the outer edge
                y="0" 
                fill="#ffffff"
                fontSize={calculatedSize}
                fontWeight="700"
                fontFamily="sans-serif"
                textAnchor="end" // Align to the right (outer edge)
                dominantBaseline="central" // Vertically center it
                style={{ pointerEvents: 'none', textShadow: '0px 0px 2px rgba(0,0,0,0.5)' }}
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
    <div className="space-y-6 max-w-5xl mx-auto pb-6 sm:pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
        <div className="text-center sm:text-left w-full sm:w-auto">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Vòng Quay May Mắn
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Chọn học sinh ngẫu nhiên cực cháy cho lớp học của bạn!
          </p>
        </div>
        
        <div className="w-full sm:w-64 bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60">
          <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={isSpinning}>
            <SelectTrigger className="border-0 shadow-none bg-blue-50/50 font-medium h-12 sm:h-10 text-base sm:text-sm">
              <SelectValue placeholder="Chọn lớp học" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map(c => (
                <SelectItem key={c.id} value={c.id} className="py-3 sm:py-1.5 text-base sm:text-sm">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-blue-100/50 shadow-xl rounded-[2rem] overflow-hidden bg-white/60 backdrop-blur-md">
        <CardContent className="p-4 sm:p-8">
          
          {isStudentsLoading && (
            <div className="py-20 flex justify-center">
               <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            </div>
          )}
          
          {studentsError && (
            <div className="py-10 text-center text-red-500 font-medium">
                Lỗi tải danh sách học sinh. Vui lòng thử lại.
            </div>
          )}

          {!isStudentsLoading && !studentsError && numSlices === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="bg-slate-100 p-6 rounded-full mb-4">
                <Users className="h-12 w-12 text-slate-400" />
              </div>
              <p className="text-slate-500 text-lg font-medium">Lớp này hiện chưa có học sinh nào.</p>
            </div>
          )}

          {!isStudentsLoading && !studentsError && numSlices > 0 && (
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-center justify-center py-4">
              
              {/* Wheel Container */}
              <div className="relative w-full max-w-[320px] sm:max-w-[420px] lg:max-w-[460px] aspect-square flex items-center justify-center">
                
                {/* Glowing Background */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 opacity-20 blur-2xl animate-pulse" />
                
                {/* Center point/Pin */}
                <div className="absolute top-1/2 left-1/2 w-10 h-10 -ml-5 -mt-5 bg-white rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.15)] border-[5px] border-slate-100 z-20 flex items-center justify-center">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-inner" />
                </div>
                
                {/* Pointer / Arrow */}
                <div 
                  className="absolute z-30 drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" 
                  style={{
                    top: '-18px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round">
                    <path d="M12 2L22 22H2L12 2Z" transform="rotate(180 12 12)" />
                  </svg>
                </div>

                {/* The SVG Wheel */}
                <svg 
                  viewBox="0 0 100 100" 
                  className="w-full h-full rounded-full relative z-10 shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'transform 8s cubic-bezier(0.15, 0, 0, 1)' : 'none',
                    backgroundColor: '#f8fafc',
                    border: '6px solid white',
                  }}
                  ref={wheelRef}
                >
                  <g>
                    {renderSlicesSimplerText()}
                  </g>
                </svg>

              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-6 bg-white/80 p-8 rounded-[2.5rem] w-full lg:w-80 shadow-lg border border-slate-100/50 backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-7xl font-black text-slate-800 tracking-tighter mb-1">
                    {numSlices}
                  </div>
                  <div className="text-slate-500 font-bold uppercase tracking-widest text-sm bg-slate-100 py-1.5 px-5 rounded-full inline-block">
                    Học sinh
                  </div>
                </div>

                <Button 
                  onClick={handleSpin} 
                  disabled={isSpinning || numSlices === 0}
                  className="w-full h-16 sm:h-14 text-xl sm:text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSpinning ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin w-5 h-5" /> ĐANG QUAY...
                    </span>
                  ) : (
                    "QUAY NGAY"
                  )}
                </Button>
                
                {numSlices > 25 && !isSpinning && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl text-center font-medium border border-amber-100">
                    Lớp đông người, tên sẽ được ẩn trên vòng quay để dễ nhìn.
                  </p>
                )}
                
                <p className="text-[11px] text-slate-400 text-center font-medium">
                  Thuật toán đảm bảo 100% ngẫu nhiên và công bằng.
                </p>
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      {/* Winner Modal */}
      <Dialog open={showWinner} onOpenChange={setShowWinner}>
        <DialogContent className="sm:max-w-md w-[90vw] mx-auto border-0 bg-transparent p-0 shadow-none">
          <div className="bg-white rounded-[2rem] p-8 sm:p-10 flex flex-col items-center text-center relative overflow-hidden shadow-2xl border border-slate-100/50">
             
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-50/50 to-transparent pointer-events-none" />
             
            <div className="bg-gradient-to-br from-yellow-100 to-amber-100 text-amber-600 p-5 rounded-full mb-6 z-10 shadow-inner">
               <Trophy className="w-12 h-12 sm:w-14 sm:h-14" />
            </div>
            
            <DialogTitle className="text-sm sm:text-base text-slate-400 font-bold mb-3 z-10 uppercase tracking-[0.2em]">
                Người chiến thắng
            </DialogTitle>
            
            <div className="text-3xl sm:text-4xl font-black text-slate-800 z-10 mb-8 px-2 leading-tight">
               {winner?.fullName}
            </div>
            
            <Button 
                onClick={() => setShowWinner(false)}
                className="w-full sm:w-auto min-w-[200px] rounded-2xl h-14 px-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 z-10 font-bold shadow-lg transition-all hover:scale-105 active:scale-95 text-lg"
            >
                Tuyệt vời
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

