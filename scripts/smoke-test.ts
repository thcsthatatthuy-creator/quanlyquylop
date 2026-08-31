/**
 * Smoke test toàn bộ luồng nghiệp vụ Quỹ Lớp (chạy với node/bun qua fetch).
 * Mô phỏng đúng spec: Admin duyệt GV → GV tạo lớp → tạo HS + thủ quỹ →
 * vi phạm → thu tiền phạt → chi → thống kê → kiểm tra phân quyền.
 */
const BASE = 'http://localhost:3000'

function makeClient() {
  let cookie = ''
  return {
    async call(method, path, body) {
      const res = await fetch(BASE + path, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      const setCookie = res.headers.get('set-cookie')
      if (setCookie) {
        cookie = setCookie.split(';')[0]
      }
      let data = {}
      try {
        data = await res.json()
      } catch {}
      return { status: res.status, data }
    },
  }
}

let passCount = 0
let failCount = 0
function check(name, cond, extra = '') {
  if (cond) {
    passCount++
    console.log(`  ✅ ${name}`)
  } else {
    failCount++
    console.log(`  ❌ ${name} ${extra}`)
  }
}

async function main() {
  const suffix = Date.now().toString().slice(-6)
  const admin = makeClient()
  const teacher = makeClient()
  const student = makeClient()
  const treasurer = makeClient()
  const outsider = makeClient()

  console.log('\n=== 1. Đăng ký & duyệt giáo viên ===')
  let r = await teacher.call('POST', '/api/auth/register', {
    fullName: `Nguyễn Văn X ${suffix}`,
    email: `teacher${suffix}@test.vn`,
    password: 'matkhau123',
    accountType: 'TEACHER',
  })
  check('GV đăng ký → PENDING (không đăng nhập được ngay)', r.status === 201)
  r = await teacher.call('POST', '/api/auth/login', { email: `teacher${suffix}@test.vn`, password: 'matkhau123' })
  check('GV PENDING đăng nhập bị chặn 403', r.status === 403, JSON.stringify(r.data))

  await admin.call('POST', '/api/auth/login', { email: 'admin@lopfund.vn', password: 'admin123' })
  r = await admin.call('GET', '/api/admin/users?role=TEACHER&status=PENDING')
  const pending = r.data.users?.find((u) => u.email === `teacher${suffix}@test.vn`)
  check('Admin thấy GV chờ duyệt', !!pending)
  r = await admin.call('PATCH', `/api/admin/users/${pending.id}`, { action: 'APPROVE' })
  check('Admin duyệt GV thành công', r.status === 200)
  r = await teacher.call('POST', '/api/auth/login', { email: `teacher${suffix}@test.vn`, password: 'matkhau123' })
  check('GV ACTIVE đăng nhập OK', r.status === 200 && r.data.user?.systemRole === 'TEACHER')

  console.log('\n=== 2. Tạo lớp + học sinh ===')
  r = await teacher.call('POST', '/api/classes', { name: `10A8-${suffix}`, schoolYear: '2026 - 2027' })
  check('GV tạo lớp 10A8', r.status === 201)
  const classId = r.data.class?.id

  r = await teacher.call('POST', `/api/classes/${classId}/students`, {
    fullName: 'Nguyễn Văn A',
    email: `hocsinha${suffix}@test.vn`,
    password: '123456',
    classRole: 'STUDENT',
  })
  check('GV tạo HS Nguyễn Văn A', r.status === 201)
  const studentId = r.data.student?.userId

  r = await teacher.call('POST', `/api/classes/${classId}/students`, {
    fullName: 'Trần Văn B',
    email: `thuquyb${suffix}@test.vn`,
    password: '123456',
    classRole: 'TREASURER',
  })
  check('GV tạo thủ quỹ Trần Văn B', r.status === 201)
  const treasurerId = r.data.student?.userId

  // Email trùng toàn hệ thống
  r = await teacher.call('POST', `/api/classes/${classId}/students`, {
    fullName: 'Trùng Email',
    email: `hocsinha${suffix}@test.vn`,
    password: '123456',
    classRole: 'STUDENT',
  })
  check('Email trùng bị từ chối 409', r.status === 409, JSON.stringify(r.data))

  console.log('\n=== 3. Đăng nhập HS (không cần mã lớp) ===')
  r = await student.call('POST', '/api/auth/login', { email: `hocsinha${suffix}@test.vn`, password: '123456' })
  check('HS đăng nhập OK', r.status === 200)
  r = await student.call('GET', '/api/auth/me')
  check('Hệ thống tự xác định lớp 10A8 qua membership', r.data.classes?.[0]?.name === `10A8-${suffix}`)
  await treasurer.call('POST', '/api/auth/login', { email: `thuquyb${suffix}@test.vn`, password: '123456' })

  console.log('\n=== 4. Phân quyền: HS không được mutation ===')
  r = await student.call('POST', `/api/classes/${classId}/violations`, {
    studentId,
    violationTypeId: 'x',
    amount: 1000,
  })
  check('HS gọi API thêm vi phạm → 403', r.status === 403, `status=${r.status}`)
  r = await student.call('POST', `/api/classes/${classId}/transactions`, { type: 'INCOME', category: 'FUND_CONTRIBUTION', amount: 1000 })
  check('HS gọi API thêm giao dịch → 403', r.status === 403, `status=${r.status}`)
  r = await student.call('GET', `/api/classes/${classId}/students`)
  check('HS không xem được danh sách HS đầy đủ → 403', r.status === 403, `status=${r.status}`)

  console.log('\n=== 5. Giáo viên khác không can thiệp lớp ===')
  await outsider.call('POST', '/api/auth/register', {
    fullName: 'GV Ngoài',
    email: `outsider${suffix}@test.vn`,
    password: '123456',
    accountType: 'TEACHER',
  })
  await admin.call('PATCH', `/api/admin/users/${(await admin.call('GET', '/api/admin/users?role=TEACHER&status=PENDING')).data.users?.find((u) => u.email === `outsider${suffix}@test.vn`)?.id}`, { action: 'APPROVE' })
  await outsider.call('POST', '/api/auth/login', { email: `outsider${suffix}@test.vn`, password: '123456' })
  r = await outsider.call('GET', `/api/classes/${classId}`)
  check('GV khác truy cập lớp không phải của mình → 403', r.status === 403, `status=${r.status}`)
  r = await outsider.call('POST', `/api/classes/${classId}/students`, {
    fullName: 'Hack',
    email: `hack${suffix}@test.vn`,
    password: '123456',
  })
  check('GV khác tạo HS trong lớp người khác → 403', r.status === 403, `status=${r.status}`)

  console.log('\n=== 6. Danh mục vi phạm + thêm vi phạm ===')
  r = await teacher.call('POST', `/api/classes/${classId}/violation-types`, { name: 'Đi học muộn', amount: 10000 })
  check('Tạo danh mục "Đi học muộn" 10.000đ', r.status === 201)
  const vtLate = r.data.violationType?.id
  await teacher.call('POST', `/api/classes/${classId}/violation-types`, { name: 'Không trực nhật', amount: 20000 })
  await teacher.call('POST', `/api/classes/${classId}/violation-types`, { name: 'Quên đồng phục', amount: 10000 })

  // Thủ quỹ thêm vi phạm
  r = await treasurer.call('POST', `/api/classes/${classId}/violations`, { studentId, violationTypeId: vtLate })
  check('Thủ quỹ thêm vi phạm (tự lấy 10.000 từ danh mục)', r.status === 201 && r.data.violation?.amount === 10000)
  const v1 = r.data.violation?.id
  await teacher.call('POST', `/api/classes/${classId}/violations`, { studentId, violationTypeId: vtLate, amount: 15000, note: 'Muộn 20 phút' })
  await treasurer.call('POST', `/api/classes/${classId}/violations`, { studentId, violationTypeId: vtLate })

  // HS xem vi phạm của mình
  r = await student.call('GET', '/api/me/violations')
  check('HS thấy 3 vi phạm của mình (30.000+5k chỉnh = 40.000)', r.data.totalCount === 3, JSON.stringify(r.data.totalAmount))
  r = await student.call('GET', '/api/me/overview')
  check('HS thấy tổng tiền vi phạm 35.000đ (10k+15k+10k)', r.data.myStats?.violationTotal === 35000, JSON.stringify(r.data.myStats))

  console.log('\n=== 7. Thu tiền phạt → tiền MỚI vào quỹ ===')
  r = await treasurer.call('GET', `/api/classes/${classId}/stats`)
  const balanceBefore = r.data.stats?.balance ?? 0
  r = await treasurer.call('POST', `/api/classes/${classId}/transactions`, {
    type: 'INCOME', category: 'PENALTY_PAYMENT', amount: 10000, studentId, description: 'Nộp tiền phạt muộn',
  })
  check('Thủ quỹ ghi nhận HS nộp 10.000 tiền phạt', r.status === 201 && r.data.balance === balanceBefore + 10000, JSON.stringify({ balance: r.data.balance }))
  r = await treasurer.call('POST', `/api/classes/${classId}/transactions`, {
    type: 'INCOME', category: 'FUND_CONTRIBUTION', amount: 100000, studentId, description: 'Đóng quỹ tháng 9',
  })
  check('Thủ quỹ ghi nhận HS đóng quỹ 100.000', r.status === 201)
  r = await treasurer.call('POST', `/api/classes/${classId}/transactions`, {
    type: 'EXPENSE', category: 'SUPPLIES', amount: 50000, description: 'Mua phấn',
  })
  check('Chi 50.000 mua phấn — backend tự tính số dư', r.status === 201)

  // Tiền phạt không gắn HS phải bị chặn
  r = await treasurer.call('POST', `/api/classes/${classId}/transactions`, {
    type: 'INCOME', category: 'PENALTY_PAYMENT', amount: 5000,
  })
  check('Tiền phạt không chọn HS → 400', r.status === 400, `status=${r.status}`)
  // EXPENSE gắn HS phải bị chặn
  r = await treasurer.call('POST', `/api/classes/${classId}/transactions`, {
    type: 'EXPENSE', category: 'SUPPLIES', amount: 5000, studentId,
  })
  check('Khoản chi gắn HS → 400', r.status === 400, `status=${r.status}`)

  console.log('\n=== 8. Thống kê & sổ quỹ ===')
  r = await teacher.call('GET', `/api/classes/${classId}/stats`)
  const st = r.data.stats
  check('Số dư = 100.000+10.000−50.000 = 60.000', st?.balance === 60000, JSON.stringify(st))
  check('Tiền phạt đã thu = 10.000', st?.penaltyCollected === 10000)
  check('Có dữ liệu biểu đồ tháng', Array.isArray(r.data.monthly) && r.data.monthly.length === 6)
  r = await teacher.call('GET', `/api/classes/${classId}/transactions?type=PENALTY_PAYMENT`)
  check('Sổ quỹ filter tiền phạt (1 dòng)', r.data.transactions?.length === 1)
  r = await treasurer.call('GET', `/api/classes/${classId}/transactions?type=all`)
  check('Thủ quỹ xem sổ quỹ (3 dòng)', r.status === 200 && r.data.transactions?.length === 3)

  console.log('\n=== 9. Quản lý HS: đổi role, khóa, reset mật khẩu ===')
  r = await teacher.call('PATCH', `/api/classes/${classId}/students/${treasurerId}`, { classRole: 'STUDENT' })
  check('GV gỡ thủ quỹ → HS thường', r.status === 200)
  r = await teacher.call('PATCH', `/api/classes/${classId}/students/${treasurerId}`, { classRole: 'TREASURER' })
  check('GV gán lại thủ quỹ', r.status === 200)
  r = await teacher.call('PATCH', `/api/users/${studentId}/status`, { status: 'SUSPENDED' })
  check('GV khóa tài khoản HS', r.status === 200)
  r = await student.call('GET', '/api/auth/me')
  check('HS bị khóa → session vô hiệu (401)', r.status === 401, `status=${r.status}`)
  r = await student.call('POST', '/api/auth/login', { email: `hocsinha${suffix}@test.vn`, password: '123456' })
  check('HS bị khóa không đăng nhập được', r.status === 403)
  await teacher.call('PATCH', `/api/users/${studentId}/status`, { status: 'ACTIVE' })
  r = await teacher.call('POST', `/api/classes/${classId}/students/${studentId}/reset-password`, { newPassword: 'matkhaumoi99' })
  check('GV reset mật khẩu HS', r.status === 200)
  r = await student.call('POST', '/api/auth/login', { email: `hocsinha${suffix}@test.vn`, password: 'matkhaumoi99' })
  check('HS đăng nhập bằng mật khẩu mới', r.status === 200)
  r = await treasurer.call('PATCH', `/api/classes/${classId}/students/${studentId}`, { classRole: 'STUDENT' })
  check('Thủ quỹ KHÔNG được đổi role (403)', r.status === 403, `status=${r.status}`)
  r = await treasurer.call('DELETE', `/api/classes/${classId}/students/${studentId}`)
  check('Thủ quỹ KHÔNG được xóa HS (403)', r.status === 403, `status=${r.status}`)

  console.log('\n=== 10. Import Excel (validate + confirm) ===')
  const rows = [
    { fullName: 'Lê Văn C', email: `levanc${suffix}@test.vn`, password: '123456', role: 'Thủ quỹ' },
    { fullName: '', email: `noName${suffix}@test.vn`, password: '123456', role: 'Học sinh' },
    { fullName: 'Trùng Email', email: `levanc${suffix}@test.vn`, password: '123456', role: 'Học sinh' },
  ]
  r = await teacher.call('POST', `/api/classes/${classId}/import-validate`, { rows })
  check('Preview: 1 hợp lệ, 2 lỗi', r.data.validCount === 1 && r.data.invalidCount === 2, JSON.stringify(r.data))
  r = await teacher.call('POST', `/api/classes/${classId}/import-confirm`, {
    rows: rows.filter((x) => x.fullName),
  })
  check('Import xác nhận: 1 HS vào lớp', r.data.imported === 1, JSON.stringify(r.data))

  console.log('\n=== 11. Audit log ===')
  r = await teacher.call('GET', '/api/audit-logs')
  const actions = (r.data.logs ?? []).map((l) => l.action)
  check('GV thấy log VIOLATION_CREATED', actions.includes('VIOLATION_CREATED'))
  check('GV thấy log TRANSACTION_CREATED', actions.includes('TRANSACTION_CREATED'))
  check('GV thấy log IMPORT_STUDENTS', actions.includes('IMPORT_STUDENTS'))
  r = await student.call('GET', '/api/audit-logs')
  check('HS KHÔNG được xem audit log (403)', r.status === 403, `status=${r.status}`)

  console.log('\n=== 12. Hồ sơ HS chi tiết ===')
  r = await teacher.call('GET', `/api/classes/${classId}/students/${studentId}/profile`)
  check('Hồ sơ HS: 3 vi phạm, đã nộp 110.000', r.data.student?.violationCount === 3 && r.data.student?.paidTotal === 110000, JSON.stringify(r.data.student))

  console.log(`\n========== KẾT QUẢ: ${passCount} PASS / ${failCount} FAIL ==========`)
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('CRASH:', e)
  process.exit(1)
})
