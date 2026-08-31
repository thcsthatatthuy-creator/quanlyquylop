'use client'

import { AppFrame, type NavItem } from '@/components/shared/app-frame'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'
import { AdminDashboard } from '@/components/views/admin/admin-dashboard'
import { AdminUsers } from '@/components/views/admin/admin-users'
import { AdminApprovals } from '@/components/views/admin/admin-approvals'
import { AdminClasses } from '@/components/views/admin/admin-classes'
import { AuditView } from '@/components/views/shared/audit-view'
import { LayoutDashboard, Users, UserCheck, School, History } from 'lucide-react'

export function AdminLayout({ path }: { path: string }) {
  const pendingQuery = useQuery<{ total: number }>({
    queryKey: ['pending-teachers-count'],
    queryFn: () => apiFetch('/api/admin/users?role=TEACHER&status=PENDING&pageSize=1'),
  })
  const pendingCount = pendingQuery.data?.total ?? 0

  const navItems: NavItem[] = [
    { label: 'Tổng quan', icon: LayoutDashboard, path: '/admin' },
    { label: 'Người dùng', icon: Users, path: '/admin/users' },
    { label: 'Duyệt giáo viên', icon: UserCheck, path: '/admin/approvals', badge: pendingCount },
    { label: 'Lớp học', icon: School, path: '/admin/classes' },
    { label: 'Audit Log', icon: History, path: '/admin/audit' },
  ]

  let content: React.ReactNode
  if (path.startsWith('/admin/users')) content = <AdminUsers />
  else if (path.startsWith('/admin/approvals')) content = <AdminApprovals />
  else if (path.startsWith('/admin/classes')) content = <AdminClasses />
  else if (path.startsWith('/admin/audit')) content = <AuditView variant="admin" />
  else content = <AdminDashboard />

  return (
    <AppFrame navItems={navItems} path={path} brandSubtitle="Quản trị hệ thống">
      {content}
    </AppFrame>
  )
}
