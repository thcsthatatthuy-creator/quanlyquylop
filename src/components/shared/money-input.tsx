'use client'

import { Input } from '@/components/ui/input'
import { useState } from 'react'

function formatVN(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n)
}

/**
 * Ô nhập tiền: hiển thị dấu chấm ngăn cách hàng nghìn theo chuẩn VN,
 * trả về số nguyên VNĐ khi onChange. Không dùng effect — giá trị hiển thị
 * được suy ra trực tiếp (focused → draft, không focused → value).
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  value: number | '' | undefined
  onChange: (v: number | '') => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  const display = focused ? draft : value === '' || value === undefined ? '' : formatVN(Number(value))

  return (
    <div className="relative">
      <Input
        inputMode="numeric"
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        value={display}
        onFocus={() => {
          setDraft(value === '' || value === undefined ? '' : formatVN(Number(value)))
          setFocused(true)
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, '')
          if (raw === '') {
            onChange('')
            setDraft('')
            return
          }
          const n = parseInt(raw, 10)
          if (n > 10_000_000_000) return
          onChange(n)
          setDraft(formatVN(n))
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        VNĐ
      </span>
    </div>
  )
}

export function parseAmountInput(v: number | '' | undefined): number | null {
  if (v === '' || v === undefined || v === null) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}
