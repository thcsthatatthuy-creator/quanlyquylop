'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers'
import { navigate } from '@/lib/client'
import { Wallet, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  path: string
  badge?: number
}

export function isActive(path: string, itemPath: string): boolean {
  if (itemPath === path) return true
  if (itemPath !== '/' && path.startsWith(itemPath + '/')) return true
  return false
}

function Brand() {
  return (
    <div className="flex items-center justify-center px-4 py-8">
      <div className="flex h-24 w-48 shrink-0 items-center justify-center overflow-hidden">
        <img src="/logo.png" alt="Logo" className="h-full w-full object-contain drop-shadow-sm scale-[1.15]" />
      </div>
    </div>
  )
}

function NavLinks({
  navItems,
  path,
  onNavigate,
}: {
  navItems: NavItem[]
  path: string
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {navItems.map((item) => {
        const active = isActive(path, item.path)
        return (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path)
              onNavigate?.()
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-blue-50 text-blue-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <item.icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-blue-700')} />
            <span className="truncate">{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

function UserBox() {
  const auth = useAuth()
  return (
    <div className="border-t border-border px-3 py-3">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
          {auth.user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{auth.user?.fullName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{auth.user?.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        onClick={auth.logout}
        className="mt-1 w-full justify-start gap-3 text-slate-600 hover:bg-red-50 hover:text-red-700"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Đăng xuất
      </Button>
    </div>
  )
}

function BottomNav({ navItems, path }: { navItems: NavItem[]; path: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-white/95 backdrop-blur lg:hidden pb-[env(safe-area-inset-bottom)]">
      {navItems.slice(0, 5).map((item) => {
        const active = isActive(path, item.path)
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium',
              active ? 'text-blue-700' : 'text-slate-500'
            )}
          >
            <item.icon className={cn('h-5 w-5', active && 'text-blue-700')} />
            <span className="max-w-full truncate">{item.label}</span>
            {active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-blue-600" />}
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="absolute right-[18%] top-1 rounded-full bg-amber-100 px-1.5 text-[9px] font-bold text-amber-800">
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

export function AppFrame({
  navItems,
  path,
  children,
}: {
  navItems: NavItem[]
  path: string
  children: React.ReactNode
}) {
  const auth = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        <Brand />
        <NavLinks navItems={navItems} path={path} />
        <UserBox />
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <NavLinks navItems={navItems} path={path} onNavigate={() => setDrawerOpen(false)} />
            <UserBox />
          </aside>
        </div>
      )}

      {/* Nội dung */}
      <div className="lg:pl-64">
        {/* Topbar mobile */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center justify-center flex-1">
            <div className="flex h-12 w-36 items-center justify-center overflow-hidden mt-1">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain scale-110" />
            </div>
          </div>
          <button
            onClick={auth.logout}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-5 w-5 text-slate-600" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <BottomNav navItems={navItems} path={path} />
    </div>
  )
}
