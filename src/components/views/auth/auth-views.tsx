'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, navigate } from '@/lib/client'
import type { AuthUser } from '@/components/providers'

export function LoginView({ onSuccess }: { onSuccess: (u: AuthUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Vui lòng nhập email và mật khẩu.')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/api/auth/login', { method: 'POST', json: { email, password } })
      const me = await apiFetch<{ user: AuthUser }>('/api/auth/me')
      onSuccess(me.user)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Đăng nhập thất bại.')
    } finally {
      setLoading(false)
    }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!email) {
      toast.error('Vui lòng nhập email.')
      return
    }
    setLoading(true)
    setForgotMessage('')
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/forgot-password', { method: 'POST', json: { email } })
      setForgotMessage(res.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/60 to-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-24 w-56 items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
        </div>

        <Card className="shadow-md border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{forgotMode ? 'Quên mật khẩu' : 'Đăng nhập'}</CardTitle>
            <CardDescription>
              {forgotMode ? 'Nhập email của bạn để tra cứu thông tin hỗ trợ.' : 'Hệ thống tự động xác định lớp của bạn — không cần nhập mã lớp.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forgotMode ? (
              <form onSubmit={submitForgot} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="ten@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {forgotMessage && (
                  <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700 font-medium">
                    {forgotMessage}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Đang tra cứu...' : 'Gửi yêu cầu'}
                </Button>
                <div className="text-center mt-2">
                  <button type="button" onClick={() => { setForgotMode(false); setForgotMessage(''); }} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                    Quay lại đăng nhập
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ten@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <button type="button" onClick={() => setForgotMode(true)} className="text-xs font-semibold text-blue-600 hover:underline">
                      Quên mật khẩu?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
              </form>
            )}

            {!forgotMode && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Chưa có tài khoản?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Đăng ký ngay
                </button>
              </p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export function RegisterView({ onSuccess }: { onSuccess: () => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accountType, setAccountType] = useState<'STUDENT' | 'TEACHER'>('STUDENT')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return toast.error('Vui lòng nhập họ và tên.')
    if (!email.trim()) return toast.error('Vui lòng nhập email.')
    if (password.length < 6) return toast.error('Mật khẩu phải có ít nhất 6 ký tự.')
    if (password !== confirm) return toast.error('Xác nhận mật khẩu không khớp.')

    setLoading(true)
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/register', {
        method: 'POST',
        json: { fullName: fullName.trim(), email: email.trim(), password, accountType },
      })
      toast.success(res.message)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Đăng ký thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/60 to-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-24 w-56 items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
        </div>

        <Card className="shadow-md border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Đăng ký</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="ten@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Mật khẩu</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Loại tài khoản</Label>
                <RadioGroup
                  value={accountType}
                  onValueChange={(v) => setAccountType(v as 'STUDENT' | 'TEACHER')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2 rounded-lg border border-border px-3 py-2 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-50/50">
                    <RadioGroupItem value="STUDENT" id="acc-student" />
                    <Label htmlFor="acc-student" className="cursor-pointer font-normal">
                      Học sinh
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border border-border px-3 py-2 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-50/50">
                    <RadioGroupItem value="TEACHER" id="acc-teacher" />
                    <Label htmlFor="acc-teacher" className="cursor-pointer font-normal">
                      Giáo viên
                    </Label>
                  </div>
                </RadioGroup>
                {accountType === 'TEACHER' && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                    Tài khoản giáo viên cần quản trị viên duyệt trước khi sử dụng.
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Đang đăng ký...' : 'Đăng ký'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Đã có tài khoản?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-semibold text-blue-700 hover:underline"
              >
                Đăng nhập
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
