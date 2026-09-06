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

// A set of elegant, clean pastel colors for the wheel
const PASTEL_COLORS = [
  '#FFD1DC', // pastel pink
  '#FFDFBA', // pastel orange
  '#FFFFB5', // pastel yellow
  '#B5EAD7', // pastel mint
  '#C7CEEA', // pastel periwinkle
]

function getShortName(fullName: string) {
  const parts = fullName.trim().split(' ')
  if (parts.length <= 2) return fullName
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
    
    const extraSpins = 5 // Spin 5 full times
    const baseRotation = (270 - sliceCenter) + (extraSpins * 360)
    
    const currentRotMod = rotation % 360
    let targetRotation = rotation - currentRotMod + baseRotation
    
    if (targetRotation <= rotation) {
        targetRotation += 360
    }

    setRotation(targetRotation)

    // Wait for the CSS transition to finish
    setTimeout(() => {
      setIsSpinning(false)
      setWinner(winningStudent)
      setShowWinner(true)
      
      // Fire confetti
      const end = Date.now() + 2 * 1000
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

    }, 5000)
  }

  // Draw the SVG paths for the wheel slices
  const renderSlicesSimplerText = () => {
    if (numSlices === 0) return null
    const sliceAngle = 360 / numSlices

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
      
      const color = PASTEL_COLORS[i % PASTEL_COLORS.length]

      // The center of the slice in degrees
      const midAngle = startAngle + sliceAngle / 2
      
      // Calculate font size dynamically based on slice angle
      const maxFontSize = 4.5
      const minFontSize = 2
      const calculatedSize = Math.max(minFontSize, Math.min(maxFontSize, sliceAngle * 0.25))
      
      return (
        <g key={i}>
          <path d={d} fill={color} stroke="#ffffff" strokeWidth="0.8" />
          <g transform={`translate(${cx}, ${cy}) rotate(${midAngle})`}>
            <text 
              x="46" // Start near the outer edge
              y="0" 
              fill="#374151" // gray-700
              fontSize={calculatedSize}
              fontWeight="600"
              fontFamily="sans-serif"
              textAnchor="end" // Align to the right (outer edge)
              dominantBaseline="middle" // Vertically center it
              style={{ pointerEvents: 'none' }}
            >
              {name}
            </text>
          </g>
        </g>
      )
    })
  }

  if (isClassesLoading) return <LoadingBlock />
  if (classesError) return <ErrorState onRetry={() => window.location.reload()} />
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-600">Vòng Quay May Mắn</h1>
          <p className="text-muted-foreground mt-1">
            Chọn học sinh ngẫu nhiên cực cháy cho lớp học của bạn!
          </p>
        </div>
        
        <div className="w-full sm:w-64 bg-white p-2 rounded-xl shadow-sm border">
          <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={isSpinning}>
            <SelectTrigger className="border-0 shadow-none bg-blue-50/50 font-medium h-10">
              <SelectValue placeholder="Chọn lớp học" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-blue-100 shadow-md rounded-3xl overflow-hidden bg-white/50 backdrop-blur">
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
              <Users className="h-16 w-16 text-slate-200 mb-4" />
              <p className="text-slate-500 text-lg font-medium">Lớp này hiện chưa có học sinh nào.</p>
            </div>
          )}

          {!isStudentsLoading && !studentsError && numSlices > 0 && (
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center justify-center">
              
              {/* Wheel Container */}
              <div className="relative w-full max-w-[400px] lg:max-w-[450px] aspect-square flex items-center justify-center">
                
                {/* Center point/Pin */}
                <div className="absolute top-1/2 left-1/2 w-8 h-8 -ml-4 -mt-4 bg-white rounded-full shadow-md border-[4px] border-slate-200 z-20 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
                </div>
                
                {/* Pointer / Arrow */}
                <div 
                  className="absolute z-30 drop-shadow-md" 
                  style={{
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#EF4444" stroke="white" strokeWidth="2" strokeLinejoin="round">
                    <path d="M12 2L22 22H2L12 2Z" transform="rotate(180 12 12)" />
                  </svg>
                </div>

                {/* The SVG Wheel */}
                <svg 
                  viewBox="0 0 100 100" 
                  className="w-full h-full rounded-full shadow-lg"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'transform 6s cubic-bezier(0.2, 0, 0, 1)' : 'none',
                    backgroundColor: '#f8fafc',
                    border: '6px solid white'
                  }}
                  ref={wheelRef}
                >
                  <g>
                    {renderSlicesSimplerText()}
                  </g>
                </svg>

              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-6 bg-slate-50 p-8 rounded-[2rem] w-full lg:w-80 border border-slate-100">
                <div className="text-center">
                  <div className="text-6xl font-black text-slate-700 mb-2">
                    {numSlices}
                  </div>
                  <div className="text-slate-500 font-semibold uppercase tracking-wider text-sm bg-slate-100 py-1.5 px-4 rounded-full">
                    Học sinh
                  </div>
                </div>

                <Button 
                  onClick={handleSpin} 
                  disabled={isSpinning || numSlices === 0}
                  className="w-full h-14 text-lg rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSpinning ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin" /> Đang quay...
                    </span>
                  ) : (
                    "QUAY NGAY"
                  )}
                </Button>
                
                <p className="text-[11px] text-blue-500 text-center font-medium opacity-70">
                  Thuật toán đảm bảo 100% ngẫu nhiên và công bằng.
                </p>
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      {/* Winner Modal */}
      <Dialog open={showWinner} onOpenChange={setShowWinner}>
        <DialogContent className="sm:max-w-md border-0 bg-transparent p-0 shadow-none">
          <div className="bg-white rounded-3xl p-10 flex flex-col items-center text-center relative overflow-hidden shadow-2xl border border-slate-100">
             
            <div className="bg-yellow-50 text-yellow-500 p-5 rounded-full mb-6 z-10">
               <Trophy className="w-12 h-12" />
            </div>
            
            <DialogTitle className="text-lg text-slate-400 font-semibold mb-2 z-10 uppercase tracking-widest">
                Người được chọn
            </DialogTitle>
            
            <div className="text-4xl font-black text-slate-800 z-10 mb-8 px-4 leading-tight">
               {winner?.fullName}
            </div>
            
            <Button 
                onClick={() => setShowWinner(false)}
                className="rounded-full h-12 px-10 bg-blue-600 text-white hover:bg-blue-700 z-10 font-bold shadow-md transition-all hover:-translate-y-0.5"
            >
                Tuyệt vời
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
