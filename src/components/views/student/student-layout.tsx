'use client'

import { AppFrame, type NavItem } from '@/components/shared/app-frame'
import { useAuth } from '@/components/providers'
import { navigate } from '@/lib/client'
import { StudentDashboard } from '@/components/views/student/student-dashboard'
import { MyProfile } from '@/components/views/student/my-profile'
import { MyViolations } from '@/components/views/student/my-violations'
import { MyFund } from '@/components/views/student/my-fund'
import { ClassDetail } from '@/components/views/teacher/class-detail'
import {
  LayoutDashboard,
  UserRound,
  TriangleAlert,
  PiggyBank,
  ClipboardList,
} from 'lucide-react'

export function StudentLayout({ path }: { path: string }) {
  const auth = useAuth()

  // Lớp mà user đang là THỦ QUỸ → được vào khu quản lý lớp (quyền giới hạn ở backend)
  const treasurerClass = auth.classes.find((c) => c.myClassRole === 'TREASURER')

  // #/class/:id/:tab — chi tiết lớp cho thủ quỹ
  const detailMatch = path.match(/^\/class\/([^/]+)(?:\/([^/]+))?$/)

  const navItems: NavItem[] = [
    { label: 'Tổng quan', icon: LayoutDashboard, path: '/my' },
    { label: 'Hồ sơ của tôi', icon: UserRound, path: '/my/profile' },
    { label: 'Vi phạm của tôi', icon: TriangleAlert, path: '/my/violations' },
    { label: 'Quỹ lớp', icon: PiggyBank, path: '/my/fund' },
  ]
  if (treasurerClass) {
    navItems.push({
      label: `Quản lý ${treasurerClass.name}`,
      icon: ClipboardList,
      path: `/class/${treasurerClass.id}`,
    })
  }

  let content: React.ReactNode
  if (detailMatch) {
    const isMyTreasurerClass = treasurerClass && detailMatch[1] === treasurerClass.id
    if (isMyTreasurerClass) {
      content = (
        <ClassDetail
          classId={detailMatch[1]}
          tab={detailMatch[2] ?? 'overview'}
          onTab={(t) => {
            window.location.hash = `/class/${detailMatch![1]}/${t}`
          }}
          onBack={() => {
            window.location.hash = '/my'
          }}
        />
      )
    } else {
      content = (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          Bạn chỉ có thể quản lý lớp mình đang làm thủ quỹ.
        </div>
      )
    }
  } else if (path.startsWith('/my/profile')) content = <MyProfile />
  else if (path.startsWith('/my/violations')) content = <MyViolations />
  else if (path.startsWith('/my/fund')) content = <MyFund />
  else content = <StudentDashboard onOpenClass={treasurerClass ? () => navigate(`/class/${treasurerClass.id}`) : undefined} />

  return (
    <AppFrame navItems={navItems} path={path} brandSubtitle="Khu vực học sinh">
      {content}
    </AppFrame>
  )
}
