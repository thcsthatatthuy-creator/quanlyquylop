# Worklog

---
Task ID: 1
Agent: Super Z (main agent)
Task: Xây dựng website Quản lý Quỹ Lớp + Học sinh + Vi phạm + Thu/Chi (Next.js 16 fullstack, theo spec 41 mục của người dùng)

Work Log:
- Khởi tạo môi trường fullstack (init script), cài thêm bcryptjs, jose, xlsx
- Thiết kế Prisma schema SQLite: User (systemRole ADMIN/TEACHER/STUDENT + status ACTIVE/PENDING/SUSPENDED), Class, ClassMember (classRole STUDENT/TREASURER, UNIQUE(classId,userId)), ViolationType, Violation, FundTransaction, ActivityLog (+classId để lọc log theo lớp)
- Seed admin mặc định: admin@lopfund.vn / admin123 (scripts/seed.ts)
- Thư viện lõi: src/lib/auth.ts (bcrypt hash + JWT httpOnly cookie 7 ngày), src/lib/permissions.ts (requireClassAccess với 4 cấp ADMIN > OWNER > TREASURER > STUDENT, mọi quyền kiểm tra ở backend), src/lib/audit.ts (logActivity), src/lib/format.ts (formatVND, nhãn tiếng Việt), src/lib/api.ts (error handler, validate)
- ~25 API routes: auth (register/login/logout/me), classes CRUD, students (create/patch role/delete/reset-password/profile/list với search-filter-sort-pagination), violation-types CRUD (xóa → vô hiệu hóa nếu đã dùng), violations (GET/POST/DELETE), transactions (GET/POST/DELETE), stats (monthly/expenseByCategory/violationByType), admin (stats/users/actions/classes), audit-logs, me (overview/violations/transactions), import-validate + import-confirm (preview trước, re-validate khi import)
- Phân quyền nghiêm ngặt: HS không mutation (403), GV khác không vào lớp (403), thủ quỹ không đổi role/xóa HS (403), tiền phạt phải gắn HS, chi không gắn HS, email unique toàn hệ thống (409)
- Frontend SPA hash-router tại "/" (app-shell + useSyncExternalStore): khu GIÁO VIÊN (dashboard lớp + chi tiết lớp 6 tab: Tổng quan/Học sinh/Vi phạm/Quỹ lớp/Giao dịch/Báo cáo), khu HỌC SINH (Tổng quan/Hồ sơ/Vi phạm/Quỹ lớp + thêm nav "Quản lý 10A8" cho thủ quỹ), khu ADMIN (Tổng quan/Người dùng/Duyệt GV/Lớp học/Audit Log)
- UI: shadcn/ui, theme emerald, sidebar desktop + bottom-nav mobile + drawer, StatCard/EmptyState/Loading/Error states, modal có confirmation cho thao tác nguy hiểm, MoneyInput format nghìn VNĐ, biểu đồ recharts (line thu-chi-phạt, donut cơ cấu chi, bar vi phạm), import Excel có bảng preview dòng hợp lệ/lỗi
- Sửa các bug phát hiện: trùng slug động [memberId]/[userId] → thống nhất [userId] tra theo user; thiếu import useState/useQuery; setMonth tràn ngày làm mất tháng trong biểu đồ (setDate(1)); thiếu route profile của HS; StatCard tiền bị cắt → formatVNDShort
- Smoke test tự động 46 assertion (scripts/smoke-test.ts): 46/46 PASS — gồm toàn bộ luồng spec mục 41 và các ca phân quyền
- Verify Agent Browser: login 4 vai trò, thêm vi phạm (auto điền tiền theo danh mục), thủ quỹ thu tiền phạt, admin duyệt GV, audit log, biểu đồ, responsive 390px; đổi tên dữ liệu demo cho thực tế (lớp 10A8/10A9, GV Nguyễn Văn X / Trần Thị Hồng)

Stage Summary:
- Hệ thống hoàn chỉnh chạy tại "/": đủ 3 system role + class role TREASURER, số dư quỹ backend tính, vi phạm tách biệt dòng tiền quỹ, audit log mọi thao tác quan trọng
- Dữ liệu demo thật đã có: 2 lớp (10A8 - Nguyễn Văn X; 10A9 - Trần Thị Hồng), HS: Nguyễn Văn A (55.000đ vi phạm, đã nộp 110.000đ), Trần Văn B (thủ quỹ 10A8), Lê Văn C; giao dịch quỹ 60.000đ số dư
- Tài khoản: admin@lopfund.vn/admin123; teacher959037@test.vn/matkhau123; hocsinha959037@test.vn/matkhaumoi99; thuquyb959037@test.vn/123456
- Lưu ý deploy: admin chỉ seed 1 lần (scripts/seed.ts); AUTH_SECRET nên đặt env production
