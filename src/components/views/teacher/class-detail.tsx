'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { OverviewTab } from '@/components/views/teacher/tabs/overview-tab'
import { StudentsTab } from '@/components/views/teacher/tabs/students-tab'
import { ViolationsTab } from '@/components/views/teacher/tabs/violations-tab'
import { FundTab } from '@/components/views/teacher/tabs/fund-tab'
import { TransactionsTab } from '@/components/views/teacher/tabs/transactions-tab'
import { ReportsTab } from '@/components/views/teacher/tabs/reports-tab'
import { SummaryTab } from '@/components/views/teacher/tabs/summary-tab'
import { ErrorState, LoadingBlock } from '@/components/shared/ui-bits'
import { StudentProfilePage } from '@/components/views/teacher/student-profile-page'

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'students', label: 'Học sinh' },
  { key: 'violations', label: 'Vi phạm' },
  { key: 'fund', label: 'Quỹ lớp' },
  { key: 'transactions', label: 'Giao dịch' },
  { key: 'reports', label: 'Báo cáo' },
  { key: 'summary', label: 'Tổng kết' },
]

interface ClassDetailData {
  class: { id: string; name: string; schoolYear: string; description: string | null; teacherId: string }
  access: 'ADMIN' | 'OWNER' | 'TREASURER' | 'STUDENT'
  stats: {
    memberCount: number
    balance: number
    totalIncome: number
    totalExpense: number
    penaltyCollected: number
    violationTotal: number
    violationCount: number
  }
}

export function ClassDetail({
  classId,
  tab,
  onTab,
  onBack,
}: {
  classId: string
  tab: string
  onTab: (t: string) => void
  onBack: () => void
}) {
  const { data, isLoading, error, refetch } = useQuery<ClassDetailData>({
    queryKey: ['class-detail', classId],
    queryFn: () => apiFetch(`/api/classes/${classId}`),
  })

  const isManager = data?.access === 'ADMIN' || data?.access === 'OWNER'
  const [key, setKey] = useState(0) // force remount tabs after mutations when needed
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null)

  if (isLoading) {
    return <LoadingBlock />
  }
  if (error || !data) {
    return <ErrorState message={(error as Error)?.message ?? 'Không tìm thấy lớp.'} onRetry={() => refetch()} />
  }

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-2 -ml-2 gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Danh sách lớp
        </Button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{data.class.name}</h1>
          <span className="text-sm text-muted-foreground">Năm học {data.class.schoolYear}</span>
          {data.access === 'TREASURER' && (
            <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Bạn là thủ quỹ lớp này
            </span>
          )}
          {isManager && (
            <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
              Giáo viên phụ trách
            </span>
          )}
        </div>
      </div>

      <div className="mb-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onTab(t.key)}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'bg-white text-blue-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {studentProfileId ? (
        <StudentProfilePage
          classId={classId}
          userId={studentProfileId}
          isManager={isManager}
          onBack={() => setStudentProfileId(null)}
        />
      ) : (
        <>
          {tab === 'overview' && <OverviewTab classId={classId} data={data} />}
          {tab === 'students' && (
            <StudentsTab
              classId={classId}
              isManager={isManager}
              onViewProfile={(userId) => setStudentProfileId(userId)}
            />
          )}
          {tab === 'violations' && (
            <ViolationsTab classId={classId} isManager={isManager} onChanged={() => setKey((k) => k + 1)} />
          )}
          {tab === 'fund' && <FundTab classId={classId} isManager={isManager} />}
          {tab === 'transactions' && <TransactionsTab classId={classId} isManager={isManager} />}
          {tab === 'reports' && <ReportsTab classId={classId} isManager={isManager} />}
          {tab === 'summary' && <SummaryTab classId={classId} isManager={isManager} />}
        </>
      )}
    </div>
  )
}
