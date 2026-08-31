// Đổi tên lớp + giáo viên từ dữ liệu smoke-test thành tên demo thực tế
const BASE = 'http://localhost:3000'

async function call(cookie: string, method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function login(email: string, password: string) {
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return (res.headers.get('set-cookie') ?? '').split(';')[0]
}

async function main() {
  const admin = await login('admin@lopfund.vn', 'admin123')

  // Đổi tên giáo viên demo
  const users = await call(admin, 'GET', '/api/admin/users?role=TEACHER&pageSize=50')
  const renames: Record<string, string> = {
    'teacher959037@test.vn': 'Nguyễn Văn X',
    'teacher027274@test.vn': 'Trần Thị Hồng',
    'outsider959037@test.vn': 'Phạm Văn Điền',
  }
  for (const u of users.data.users ?? []) {
    if (renames[u.email]) {
      await call(admin, 'PATCH', `/api/admin/users/${u.id}`, {
        action: 'UPDATE_INFO',
        fullName: renames[u.email],
      })
      console.log('renamed teacher', u.email, '→', renames[u.email])
    }
  }

  // Đổi tên lớp demo
  const classes = await call(admin, 'GET', '/api/admin/classes')
  const classRenames: Record<string, string> = {
    '10A8-959037': '10A8',
    '10A8-027274': '10A9',
  }
  for (const c of classes.data.classes ?? []) {
    if (classRenames[c.name]) {
      // admin không sở hữu lớp → dùng PATCH qua quyền admin (requireClassManager cho ADMIN)
      await call(admin, 'PATCH', `/api/classes/${c.id}`, {
        name: classRenames[c.name],
        schoolYear: c.schoolYear,
        description: c.description ?? '',
      })
      console.log('renamed class', c.name, '→', classRenames[c.name])
    }
  }

  console.log('DONE')
}

main()
