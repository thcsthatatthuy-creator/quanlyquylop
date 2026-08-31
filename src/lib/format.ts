// Format tiền tệ & ngày tháng theo chuẩn Việt Nam.
// Database luôn lưu số nguyên (VNĐ) — KHÔNG lưu chuỗi "10.000 VNĐ".

export function formatVND(amount: number | null | undefined): string {
  const n = typeof amount === 'number' ? amount : 0
  return `${new Intl.NumberFormat('vi-VN').format(n)} VNĐ`
}

export function formatVNDShort(amount: number | null | undefined): string {
  const n = typeof amount === 'number' ? amount : 0
  return `${new Intl.NumberFormat('vi-VN').format(n)}đ`
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(d)
}

// Nhãn hiển thị
export const SYSTEM_ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  TEACHER: 'Giáo viên',
  STUDENT: 'Học sinh',
}

export const CLASS_ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Học sinh',
  TREASURER: 'Thủ quỹ',
}

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  PENDING: 'Chờ duyệt',
  SUSPENDED: 'Bị khóa',
}

export const TX_TYPE_LABEL: Record<string, string> = {
  INCOME: 'Thu',
  EXPENSE: 'Chi',
}

export const TX_CATEGORY_LABEL: Record<string, string> = {
  FUND_CONTRIBUTION: 'Đóng quỹ',
  PENALTY_PAYMENT: 'Tiền phạt',
  OTHER_INCOME: 'Thu khác',
  SUPPLIES: 'Đồ dùng lớp',
  ACTIVITY: 'Hoạt động',
  DECORATION: 'Trang trí',
  OTHER_EXPENSE: 'Chi khác',
}

export const INCOME_CATEGORIES = ['FUND_CONTRIBUTION', 'PENALTY_PAYMENT', 'OTHER_INCOME']
export const EXPENSE_CATEGORIES = ['SUPPLIES', 'ACTIVITY', 'DECORATION', 'OTHER_EXPENSE']

export const ACTION_LABEL: Record<string, string> = {
  REGISTER: 'Đăng ký tài khoản',
  LOGIN: 'Đăng nhập',
  TEACHER_APPROVED: 'Duyệt giáo viên',
  TEACHER_REJECTED: 'Từ chối giáo viên',
  USER_SUSPENDED: 'Khóa tài khoản',
  USER_ACTIVATED: 'Mở khóa tài khoản',
  USER_CREATED: 'Tạo tài khoản',
  USER_UPDATED: 'Cập nhật người dùng',
  USER_DELETED: 'Xóa tài khoản',
  PASSWORD_RESET: 'Đặt lại mật khẩu',
  ROLE_CHANGED: 'Đổi vai trò',
  CLASS_CREATED: 'Tạo lớp học',
  CLASS_UPDATED: 'Cập nhật lớp học',
  CLASS_DELETED: 'Xóa lớp học',
  STUDENT_ADDED: 'Thêm học sinh vào lớp',
  STUDENT_REMOVED: 'Xóa học sinh khỏi lớp',
  IMPORT_STUDENTS: 'Import học sinh từ Excel',
  VIOLATION_TYPE_CREATED: 'Tạo danh mục vi phạm',
  VIOLATION_TYPE_UPDATED: 'Cập nhật danh mục vi phạm',
  VIOLATION_TYPE_DELETED: 'Xóa danh mục vi phạm',
  VIOLATION_CREATED: 'Thêm vi phạm',
  VIOLATION_DELETED: 'Xóa vi phạm',
  TRANSACTION_CREATED: 'Thêm giao dịch quỹ',
  TRANSACTION_DELETED: 'Xóa giao dịch quỹ',
}
