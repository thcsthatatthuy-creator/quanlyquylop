// Sinh mật khẩu ngẫu nhiên dễ đọc (loại bỏ ký tự dễ nhầm lẫn)
export function generatePassword(length = 8): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  const arr = new Uint32Array(length)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(arr)
    for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length]
  } else {
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}
