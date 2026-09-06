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
import { Loader2, Users, Trophy, Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

// Colors inspired by Image 2 (softer, varied, very appealing)
const VIBRANT_COLORS = [
  '#FF5E7E', // Soft Red/Pink
  '#36A2EB', // Blue
  '#FFCE56', // Yellow
  '#4BC0C0', // Teal/Cyan
  '#9966FF', // Purple
  '#FF9F40', // Orange
  '#E7E9ED', // Light Gray/White
  '#8E44AD', // Deep Purple
  '#2ECC71', // Green
  '#F1C40F', // Bright Yellow
  '#E74C3C', // Red
  '#3498DB', // Light Blue
]

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
  const [customList, setCustomList] = useState<string>('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0) // Tracks current visual rotation
  const [winner, setWinner] = useState<string | null>(null)
  const [showWinner, setShowWinner] = useState(false)
  
  const wheelRef = useRef<SVGGElement>(null)

  // Populate customList when students load (only if we haven't manually wiped it, or just on class change)
  useEffect(() => {
    if (students) {
      // Map to full names, or short names. We'll put full names in the textarea, 
      // users can edit them.
      const names = students.map(s => {
        const parts = s.fullName.trim().split(' ')
        if (parts.length <= 1) return s.fullName
        return parts.slice(-2).join(' ')
      })
      setCustomList(names.join('\n'))
    }
  }, [students, selectedClassId])

  // Derive active names from textarea
  const names = customList.split('\n').map(n => n.trim()).filter(n => n !== "")
  const numSlices = names.length

  const handleSpin = () => {
    if (numSlices === 0 || isSpinning) return

    setIsSpinning(true)
    setWinner(null)
    setShowWinner(false)
    
    // 1. Pick a random winner index
    const winnerIndex = Math.floor(Math.random() * numSlices)
    const winningName = names[winnerIndex]

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
      setWinner(winningName)
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
    const hideText = numSlices > 40 // Allow more text before hiding

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
                style={{ pointerEvents: 'none', textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
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
    <div className="space-y-6 max-w-6xl mx-auto pb-6 sm:pb-20 relative">
      
      {/* Decorative Flying Dragons / Elements */}
      {/* Absolute positioned dragons floating around */}
      <div className="hidden lg:block absolute top-10 -left-10 w-40 h-40 opacity-70 animate-[bounce_6s_infinite] pointer-events-none z-0 mix-blend-multiply">
         <img src="https://media.giphy.com/media/l41JUI1LhB1Yf5Pj2/giphy.gif" alt="Dragon" className="w-full h-full object-contain filter drop-shadow-xl" onError={(e) => e.currentTarget.style.display = 'none'} />
      </div>
      <div className="hidden lg:block absolute bottom-20 -right-5 w-32 h-32 opacity-70 animate-[bounce_8s_infinite] pointer-events-none z-0 mix-blend-multiply" style={{ animationDelay: '1s', transform: 'scaleX(-1)' }}>
         <img src="https://media.giphy.com/media/l41JUI1LhB1Yf5Pj2/giphy.gif" alt="Dragon" className="w-full h-full object-contain filter drop-shadow-xl" onError={(e) => e.currentTarget.style.display = 'none'} />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 relative z-10">
        <div className="text-center sm:text-left w-full sm:w-auto">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-red-500 flex items-center justify-center sm:justify-start gap-2">
            <Sparkles className="text-amber-500 w-8 h-8" />
            Vòng Quay May Mắn
            <Sparkles className="text-red-500 w-8 h-8" />
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Chọn kết quả ngẫu nhiên cực cháy cho lớp học của bạn!
          </p>
        </div>
        
        <div className="w-full sm:w-64 bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60">
          <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={isSpinning}>
            <SelectTrigger className="border-0 shadow-none bg-amber-50/50 font-medium h-12 sm:h-10 text-base sm:text-sm">
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

      <Card className="border-amber-200/50 shadow-2xl rounded-[2rem] overflow-hidden bg-white/70 backdrop-blur-xl relative z-10">
        <CardContent className="p-4 sm:p-8">
          
          {isStudentsLoading && (
            <div className="py-20 flex justify-center">
               <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
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
                
                {/* Glowing Background */}
                <div className="absolute inset-[-20px] rounded-full bg-gradient-to-tr from-amber-400 to-red-500 opacity-20 blur-3xl animate-pulse" />
                
                {/* Outer Golden Rim */}
                <div className="absolute inset-0 rounded-full border-[10px] sm:border-[16px] border-[#F1C40F] shadow-[0_0_30px_rgba(241,196,15,0.6),inset_0_0_20px_rgba(0,0,0,0.3)] ring-4 ring-[#D4AC0D] bg-white z-0 overflow-hidden">
                  {/* The SVG Wheel */}
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

                {/* Pointer / Arrow (Golden/Red) */}
                <div 
                  className="absolute z-30 drop-shadow-[0_6px_10px_rgba(0,0,0,0.4)]" 
                  style={{
                    top: '-15px', // Adjusted for thicker border
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="#E74C3C" stroke="#F1C40F" strokeWidth="2" strokeLinejoin="round">
                    <path d="M12 2L22 22H2L12 2Z" transform="rotate(180 12 12)" />
                  </svg>
                </div>

                {/* Center point/Pin & Spin Button */}
                <button 
                  onClick={handleSpin}
                  disabled={isSpinning || numSlices === 0}
                  className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-24 sm:h-24 -ml-10 -mt-10 sm:-ml-12 sm:-mt-12 bg-gradient-to-b from-[#3498DB] to-[#2980B9] rounded-full shadow-[0_0_20px_rgba(0,0,0,0.4),inset_0_4px_8px_rgba(255,255,255,0.4)] border-[4px] sm:border-[6px] border-[#F1C40F] z-20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 ring-4 ring-white/30"
                >
                   <span className="text-white font-black text-lg sm:text-xl uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                      Quay
                   </span>
                </button>

              </div>

              {/* Right Side: Custom List Controls */}
              <div className="flex flex-col bg-white/90 p-5 sm:p-6 rounded-[2rem] w-full lg:w-80 shadow-xl border border-slate-100/80 backdrop-blur-md h-[420px] sm:h-[480px]">
                <div className="flex justify-between items-center mb-4">
                  <div className="font-bold text-slate-700 text-lg flex items-center gap-2">
                    Các kết quả 
                    <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-black">
                      {numSlices}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-slate-500 mb-3 font-medium">
                  Bạn có thể sửa danh sách này. Thêm hoặc xoá tên tuỳ ý, mỗi người 1 dòng.
                </p>

                <Textarea 
                  value={customList}
                  onChange={(e) => setCustomList(e.target.value)}
                  disabled={isSpinning}
                  className="w-full flex-1 p-4 rounded-xl border border-slate-200 resize-none outline-none focus-visible:ring-2 focus-visible:ring-amber-400 text-sm font-medium text-slate-700 bg-slate-50/50 disabled:opacity-50"
                  placeholder="Nhập nội dung vào đây...&#10;Hoa&#10;Trang&#10;Mai&#10;Lan"
                />

                {numSlices > 40 && !isSpinning && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl text-center font-medium border border-amber-100 mt-4">
                    Danh sách quá dài, văn bản trên vòng quay sẽ được ẩn.
                  </p>
                )}
                
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      {/* Winner Modal */}
      <Dialog open={showWinner} onOpenChange={setShowWinner}>
        <DialogContent className="sm:max-w-md w-[90vw] mx-auto border-0 bg-transparent p-0 shadow-none">
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 flex flex-col items-center text-center relative overflow-hidden shadow-2xl border border-slate-100/50">
             
            {/* Modal Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-50 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-300 rounded-full blur-3xl opacity-30" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-red-400 rounded-full blur-3xl opacity-20" />
            </div>

            <div className="bg-gradient-to-br from-amber-300 to-amber-500 text-white p-6 rounded-full mb-6 z-10 shadow-[0_10px_20px_rgba(245,158,11,0.3)] border-4 border-amber-100">
               <Trophy className="w-14 h-14 sm:w-16 sm:h-16" />
            </div>
            
            <DialogTitle className="text-sm sm:text-base text-slate-400 font-bold mb-3 z-10 uppercase tracking-[0.2em]">
                Kết quả quay
            </DialogTitle>
            
            <div className="text-4xl sm:text-5xl font-black text-slate-800 z-10 mb-8 px-2 leading-tight drop-shadow-sm">
               {winner}
            </div>
            
            <Button 
                onClick={() => setShowWinner(false)}
                className="w-full sm:w-auto min-w-[200px] rounded-2xl h-14 px-10 bg-gradient-to-r from-amber-500 to-red-500 text-white hover:from-amber-600 hover:to-red-600 z-10 font-bold shadow-[0_8px_20px_rgba(239,68,68,0.3)] transition-all hover:scale-105 active:scale-95 text-lg border-b-4 border-red-700"
            >
                TUYỆT VỜI!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
