'use client'

import { AppFrame, type NavItem } from '@/components/shared/app-frame'
import { useAuth } from '@/components/providers'
import { TeacherDashboard } from '@/components/views/teacher/teacher-dashboard'
import { ClassDetail } from '@/components/views/teacher/class-detail'
import { AuditView } from '@/components/views/shared/audit-view'
import { LuckyWheelView } from '@/components/views/teacher/lucky-wheel-view'
import { LayoutDashboard, History, Gift } from 'lucide-react'

export function TeacherLayout({ path }: { path: string }) {
  const auth = useAuth()

  // #/classes/:id/:tab
  const detailMatch = path.match(/^\/classes\/([^/]+)(?:\/([^/]+))?$/)

  const navItems: NavItem[] = [
    { label: 'Vòng quay may mắn', icon: Gift, path: '/wheel' },
    { label: 'Tổng quan', icon: LayoutDashboard, path: '/classes' },
    { label: 'Lịch sử hoạt động', icon: History, path: '/audit' },
  ]

  let content: React.ReactNode
  if (detailMatch) {
    content = (
      <ClassDetail
        classId={detailMatch[1]}
        tab={detailMatch[2] ?? 'overview'}
        onTab={(t) => {
          window.location.hash = `/classes/${detailMatch![1]}/${t}`
        }}
        onBack={() => {
          window.location.hash = '/classes'
        }}
      />
    )
  } else if (path.startsWith('/audit')) {
    content = <AuditView variant="teacher" />
  } else if (path.startsWith('/wheel')) {
    content = <LuckyWheelView />
  } else {
    content = <TeacherDashboard />
  }

  return (
    <AppFrame
      navItems={navItems}
      path={path}
      brandSubtitle={auth.user ? `GV · ${auth.user.fullName}` : 'Khu vực giáo viên'}
    >
      {content}
    </AppFrame>
  )
}
