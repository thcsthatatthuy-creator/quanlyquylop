'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Trophy, AlertTriangle, Download } from 'lucide-react'
import { ErrorState, LoadingBlock } from '@/components/shared/ui-bits'

interface SummaryData {
  isArchived: boolean
  summary: {
    leaderboard: { id: string; name: string; total: number }[]
  }
  createdAt?: string
}

export function SummaryTab({ classId, isManager }: { classId: string; isManager: boolean }) {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery<SummaryData>({
    queryKey: ['class-summary', classId],
    queryFn: () => apiFetch(`/api/classes/${classId}/summary`),
  })

  const summarizeMutation = useMutation({
    mutationFn: () => apiFetch(`/api/classes/${classId}/summary`, { method: 'POST', json: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-summary', classId] })
      queryClient.invalidateQueries({ queryKey: ['class-detail', classId] })
    },
  })

  if (isLoading) return <LoadingBlock />
  if (error || !data) return <ErrorState message="Lỗi tải tổng kết" />

  const { isArchived, summary, createdAt } = data
  const { leaderboard } = summary

  const handleSummarize = () => {
    if (confirm('* Cảnh báo : nếu ấn đồng ý xác nhận mọi dư liệu liên quan tới doanh thu và các vi phạm sẽ biến mất . KHÔNG THỂ HOÀN TÁC !')) {
      if (confirm('LƯU Ý CUỐI: Ấn Đồng ý phạt nữa sẽ đưa ra cái bảng xếp hạng đó nha tồn tại trong 2 ngày . Còn các dữ liệu như vi phạm sẽ tự động xóa sạch...')) {
        summarizeMutation.mutate()
      }
    }
  }

  // Generate Excel download
  const downloadExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
    csvContent += "Xếp hạng,Học sinh,Số tiền cống hiến\n"
    
    leaderboard.forEach((row, index) => {
      csvContent += `${index + 1},${row.name},${row.total}\n`
    })
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `TongKetLop_${classId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" /> 
            {isArchived ? 'Bảng Vàng (Đã chốt sổ)' : 'Bảng Vàng Doanh Thu Cống Hiến'}
          </h2>
          {isArchived && createdAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Chốt sổ lúc: {new Date(createdAt).toLocaleString('vi-VN')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {leaderboard.length > 0 && (
            <Button variant="outline" onClick={downloadExcel}>
              <Download className="h-4 w-4 mr-2" />
              Xuất CSV
            </Button>
          )}
          {!isArchived && isManager && (
            <Button variant="destructive" onClick={handleSummarize} disabled={summarizeMutation.isPending}>
              <AlertTriangle className="h-4 w-4 mr-2" /> 
              Xác nhận chốt sổ
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Chưa có dữ liệu đóng góp.</div>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50 shadow-sm relative overflow-hidden">
                  {/* Decorative background for top 3 */}
                  {idx === 0 && <div className="absolute inset-0 bg-gradient-to-r from-yellow-50 to-transparent opacity-50" />}
                  {idx === 1 && <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-transparent opacity-50" />}
                  {idx === 2 && <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-transparent opacity-50" />}
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${idx === 0 ? 'bg-yellow-500 text-lg scale-110' : idx === 1 ? 'bg-slate-400 scale-105' : idx === 2 ? 'bg-amber-600 scale-105' : 'bg-slate-300'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-base">{item.name}</div>
                      {idx === 0 && <div className="text-xs text-yellow-600 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1"><Trophy className="w-3 h-3"/> Top 1 Cống Hiến</div>}
                      {idx === 1 && <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Top 2 Cống Hiến</div>}
                      {idx === 2 && <div className="text-xs text-amber-600 font-bold uppercase tracking-wider mt-0.5">Top 3 Cống Hiến</div>}
                    </div>
                  </div>
                  <div className="font-bold text-red-600 text-lg relative z-10">
                    {item.total.toLocaleString()} đ
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
