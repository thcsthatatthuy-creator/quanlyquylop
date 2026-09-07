'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/client'
import { toast } from 'sonner'
import { Loader2, FileSpreadsheet, CircleCheck, CircleX, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PreviewRow {
  index: number
  fullName: string
  email: string
  password: string
  classRole: string
  gender: string | null
  valid: boolean
  errors: string[]
}

/**
 * Import học sinh từ Excel:
 * Bước 1: chọn file → client parse (SheetJS) → gửi backend validate → HIỂN THỊ PREVIEW
 * Bước 2: người dùng kiểm tra → chỉ import các dòng hợp lệ (xác nhận rõ ràng)
 */
export function ImportStudentsModal({
  open,
  onClose,
  classId,
  onImported,
}: {
  open: boolean
  onClose: () => void
  classId: string
  onImported: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [summary, setSummary] = useState<{ validCount: number; invalidCount: number; totalRows: number } | null>(null)

  function reset() {
    setFileName('')
    setPreview(null)
    setSummary(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleFile(file: File) {
    setFileName(file.name)
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

      const mapped = rows.map((r) => {
        const get = (...keys: string[]) => {
          for (const k of Object.keys(r)) {
            if (keys.some((key) => k.toLowerCase().trim() === key.toLowerCase())) {
              return String(r[k] ?? '').trim()
            }
          }
          return ''
        }
        return {
          fullName: get('Họ và tên', 'Ho va ten', 'fullName', 'Họ tên'),
          email: get('Email', 'email'),
          password: get('Mật khẩu', 'Mat khau', 'password'),
          role: get('Role', 'Vai trò', 'Vai tro'),
          gender: get('Giới tính', 'Gioi tinh', 'Gender'),
        }
      })

      setParsing(false)
      setValidating(true)
      const res = await apiFetch<{
        preview: PreviewRow[]
        validCount: number
        invalidCount: number
        totalRows: number
      }>(`/api/classes/${classId}/import-validate`, { method: 'POST', json: { rows: mapped } })
      setPreview(res.preview)
      setSummary({ validCount: res.validCount, invalidCount: res.invalidCount, totalRows: res.totalRows })
      if (res.totalRows === 0) toast.error('File không có dữ liệu.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể đọc file Excel.')
      reset()
    } finally {
      setParsing(false)
      setValidating(false)
    }
  }

  async function confirmImport() {
    if (!preview) return
    const validRows = preview
      .filter((r) => r.valid)
      .map((r) => ({ fullName: r.fullName, email: r.email, password: r.password, classRole: r.classRole, gender: r.gender }))
    if (validRows.length === 0) return toast.error('Không có dòng hợp lệ nào.')
    setImporting(true)
    try {
      const res = await apiFetch<{ message: string }>(`/api/classes/${classId}/import-confirm`, {
        method: 'POST',
        json: { rows: validRows },
      })
      toast.success(res.message)
      reset()
      onImported()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import thất bại.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import học sinh từ Excel</DialogTitle>
          <DialogDescription>
            Cột: <b>Họ và tên | Email | Mật khẩu | Giới tính | Role</b> (Role: Học sinh / Thủ quỹ). Bạn sẽ kiểm
            tra trước khi import.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-10 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/30',
                (parsing || validating) && 'pointer-events-none opacity-60'
              )}
            >
              <FileSpreadsheet className="h-8 w-8 text-blue-600" />
              <p className="mt-2 text-sm font-medium">
                {parsing ? 'Đang đọc file...' : validating ? 'Đang kiểm tra dữ liệu...' : 'Nhấn để chọn file Excel (.xlsx, .xls, .csv)'}
              </p>
              {fileName && <p className="mt-1 text-xs text-muted-foreground">{fileName}</p>}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-100 px-3 py-2">
                <p className="text-lg font-bold">{summary?.totalRows}</p>
                <p className="text-xs text-muted-foreground">Tổng dòng</p>
              </div>
              <div className="rounded-lg bg-blue-50 px-3 py-2">
                <p className="text-lg font-bold text-blue-700">{summary?.validCount}</p>
                <p className="text-xs text-blue-700">Dòng hợp lệ</p>
              </div>
              <div className="rounded-lg bg-red-50 px-3 py-2">
                <p className="text-lg font-bold text-red-700">{summary?.invalidCount}</p>
                <p className="text-xs text-red-700">Dòng lỗi</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-2 py-2 font-semibold">#</th>
                    <th className="px-2 py-2 font-semibold">Họ tên</th>
                    <th className="px-2 py-2 font-semibold">Email</th>
                    <th className="px-2 py-2 font-semibold">Giới tính</th>
                    <th className="px-2 py-2 font-semibold">Role</th>
                    <th className="px-2 py-2 font-semibold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.index} className={cn('border-t', !r.valid && 'bg-red-50/50')}>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.index + 1}</td>
                      <td className="max-w-[140px] truncate px-2 py-1.5">{r.fullName || '—'}</td>
                      <td className="max-w-[180px] truncate px-2 py-1.5">{r.email || '—'}</td>
                      <td className="px-2 py-1.5">{r.gender || '—'}</td>
                      <td className="px-2 py-1.5">{r.classRole === 'TREASURER' ? 'Thủ quỹ' : 'Học sinh'}</td>
                      <td className="px-2 py-1.5">
                        {r.valid ? (
                          <span className="inline-flex items-center gap-1 font-medium text-blue-700">
                            <CircleCheck className="h-3.5 w-3.5" /> Hợp lệ
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 font-medium text-red-700"
                            title={r.errors.join(', ')}
                          >
                            <CircleX className="h-3.5 w-3.5 shrink-0" /> {r.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summary && summary.invalidCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Các dòng lỗi sẽ bị bỏ qua khi import. Email trùng hệ thống/file phải được sửa trong
                file Excel rồi tải lên lại.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {preview ? (
            <>
              <Button variant="outline" onClick={reset}>
                Chọn file khác
              </Button>
              <Button
                onClick={confirmImport}
                disabled={importing || !summary || summary.validCount === 0}
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {summary?.validCount ?? 0} dòng hợp lệ
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
