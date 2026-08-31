'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CLASS_ROLE_LABEL,
  STATUS_LABEL,
  SYSTEM_ROLE_LABEL,
  TX_CATEGORY_LABEL,
  TX_TYPE_LABEL,
} from '@/lib/format'

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    TREASURER: 'bg-amber-50 text-amber-700 border-amber-200',
    STUDENT: 'bg-slate-100 text-slate-700 border-slate-200',
    TEACHER: 'bg-blue-50 text-blue-700 border-blue-200',
    ADMIN: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  const label =
    CLASS_ROLE_LABEL[role] ?? SYSTEM_ROLE_LABEL[role] ?? role
  return (
    <Badge variant="outline" className={cn('font-medium', map[role])}>
      {label}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-blue-50 text-blue-700 border-blue-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <Badge variant="outline" className={cn('font-medium', map[status])}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}

export function TypeBadge({ type }: { type: string }) {
  return type === 'INCOME' ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
      {TX_TYPE_LABEL.INCOME}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
      {TX_TYPE_LABEL.EXPENSE}
    </span>
  )
}

export function CategoryLabel({ category }: { category: string }) {
  return <>{TX_CATEGORY_LABEL[category] ?? category}</>
}

export function AmountText({
  type,
  amount,
  className,
}: {
  type: 'INCOME' | 'EXPENSE' | string
  amount: number
  className?: string
}) {
  const text = `${type === 'INCOME' ? '+' : '−'}${new Intl.NumberFormat('vi-VN').format(amount)}đ`
  return (
    <span
      className={cn(
        'font-semibold tabular-nums whitespace-nowrap',
        type === 'INCOME' ? 'text-blue-700' : 'text-red-700',
        className
      )}
    >
      {text}
    </span>
  )
}
