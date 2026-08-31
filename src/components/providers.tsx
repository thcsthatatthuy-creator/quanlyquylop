'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useContext, useMemo, type ReactNode } from 'react'

export interface MyClass {
  id: string
  name: string
  schoolYear: string
  description: string | null
  teacherName: string
  memberCount: number
  myClassRole: string | null
}

export interface AuthUser {
  id: string
  fullName: string
  email: string
  systemRole: 'ADMIN' | 'TEACHER' | 'STUDENT'
  status: string
}

interface AuthContextValue {
  user: AuthUser | null
  classes: MyClass[]
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  classes: [],
  loading: true,
  refresh: async () => {},
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function Providers({
  children,
  auth,
}: {
  children: ReactNode
  auth: AuthContextValue
}) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
        },
      }),
    []
  )
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  )
}
