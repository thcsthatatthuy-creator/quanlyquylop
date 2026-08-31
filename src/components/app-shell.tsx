'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { apiFetch, navigate } from '@/lib/client'
import { Providers, useAuth, type AuthUser, type MyClass } from '@/components/providers'
import { LoginView, RegisterView } from '@/components/views/auth/auth-views'
import { TeacherLayout } from '@/components/views/teacher/teacher-layout'
import { StudentLayout } from '@/components/views/student/student-layout'
import { AdminLayout } from '@/components/views/admin/admin-layout'
import { Wallet } from 'lucide-react'

function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

function getHashSnapshot(): string {
  const h = window.location.hash.replace(/^#/, '')
  return h || '/'
}

function getServerSnapshot(): string {
  return '/'
}

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600">
        <Wallet className="h-7 w-7 animate-pulse text-white" />
      </div>
      <p className="text-sm text-muted-foreground">Đang tải Quỹ Lớp...</p>
    </div>
  )
}

function AppRouter() {
  const auth = useAuth()
  const path = useSyncExternalStore(subscribeHash, getHashSnapshot, getServerSnapshot)

  // Chưa đăng nhập mà đứng ở route khác → về login
  useEffect(() => {
    if (auth.loading || auth.user) return
    if (path !== '/login' && path !== '/register') navigate('/login')
  }, [auth.loading, auth.user, path])

  // Đã đăng nhập mà đứng ở trang auth → đưa về đúng khu vực vai trò
  useEffect(() => {
    if (auth.loading || !auth.user) return
    if (path === '/' || path === '/login' || path === '/register') {
      if (auth.user.systemRole === 'ADMIN') navigate('/admin')
      else if (auth.user.systemRole === 'TEACHER') navigate('/classes')
      else navigate('/my')
    }
  }, [auth.loading, auth.user, path])

  if (auth.loading) return <Splash />

  if (!auth.user) {
    if (path === '/register') return <RegisterView onSuccess={() => navigate('/login')} />
    return <LoginView onSuccess={() => auth.refresh()} />
  }

  if (auth.user.systemRole === 'ADMIN') return <AdminLayout path={path} />
  if (auth.user.systemRole === 'TEACHER') return <TeacherLayout path={path} />
  return <StudentLayout path={path} />
}

export function AppShell() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [classes, setClasses] = useState<MyClass[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await apiFetch<{ user: AuthUser; classes: MyClass[] }>('/api/auth/me')
      setUser(me.user)
      setClasses(me.classes ?? [])
    } catch {
      setUser(null)
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
      setClasses([])
      navigate('/login')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const auth = useMemo(
    () => ({ user, classes, loading, refresh, logout }),
    [user, classes, loading, refresh, logout]
  )

  return (
    <Providers auth={auth}>
      <AppRouter />
    </Providers>
  )
}
