'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/client'

export interface StudentRow {
  membershipId: string
  userId: string
  fullName: string
  email: string
  status: string
  classRole: string
  joinedAt: string
  violationTotal: number
  violationCount: number
}

export function useClassStudents(classId: string, enabled = true) {
  return useQuery<{ students: StudentRow[] }>({
    queryKey: ['class-students', classId],
    queryFn: () =>
      apiFetch(`/api/classes/${classId}/students?page=1&pageSize=100&sort=name`),
    enabled: enabled && !!classId,
  })
}

export interface ViolationTypeRow {
  id: string
  name: string
  amount: number
  active: boolean
  _count: { violations: number }
}

export function useViolationTypes(classId: string, enabled = true) {
  return useQuery<{ violationTypes: ViolationTypeRow[] }>({
    queryKey: ['violation-types', classId],
    queryFn: () => apiFetch(`/api/classes/${classId}/violation-types`),
    enabled: enabled && !!classId,
  })
}
