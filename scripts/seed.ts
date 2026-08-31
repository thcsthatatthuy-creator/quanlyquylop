import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning up existing database (except admin)...')

  // We want to delete everything EXCEPT the admin account (admin@gmail.com)
  const adminEmail = 'admin@gmail.com'
  
  // Delete all non-admin users and their related data
  await prisma.activityLog.deleteMany()
  await prisma.fundTransaction.deleteMany()
  await prisma.violation.deleteMany()
  await prisma.classMember.deleteMany()
  await prisma.violationType.deleteMany()
  await prisma.class.deleteMany()
  await prisma.user.deleteMany({
    where: { email: { not: adminEmail } }
  })

  // Ensure Admin exists
  const passwordHash = await bcrypt.hash('admin123', 10)
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        fullName: 'Quản trị viên',
        email: adminEmail,
        passwordHash,
        systemRole: 'ADMIN',
        status: 'ACTIVE',
      },
    })
    console.log('Created admin:', admin.email)
  } else {
    console.log('Admin already exists:', admin.email)
  }

  // Create a Teacher
  const teacher = await prisma.user.create({
    data: {
      fullName: 'Nguyễn Văn A',
      email: 'nguyen.vana@gmail.com',
      passwordHash: await bcrypt.hash('123456', 10),
      systemRole: 'TEACHER',
      status: 'ACTIVE',
    }
  })
  console.log('Created teacher:', teacher.email)

  // Create Classes
  const class1 = await prisma.class.create({
    data: {
      name: '12A1',
      schoolYear: '2025-2026',
      description: 'Lớp chuyên Toán',
      teacherId: teacher.id,
    }
  })

  const class2 = await prisma.class.create({
    data: {
      name: '12A2',
      schoolYear: '2025-2026',
      description: 'Lớp chuyên Lý',
      teacherId: teacher.id,
    }
  })

  console.log('Created classes: 12A1, 12A2')

  // Create Violation Types for 12A1
  const vt1 = await prisma.violationType.create({ data: { name: 'Đi học muộn', amount: 20000, classId: class1.id } })
  const vt2 = await prisma.violationType.create({ data: { name: 'Không làm bài tập', amount: 50000, classId: class1.id } })
  const vt3 = await prisma.violationType.create({ data: { name: 'Nói chuyện riêng', amount: 10000, classId: class1.id } })
  
  // Create Violation Types for 12A2
  await prisma.violationType.create({ data: { name: 'Đi học muộn', amount: 20000, classId: class2.id } })
  
  // Create Students for 12A1
  const s1 = await prisma.user.create({ data: { fullName: 'Trần B', email: 'tranb@gmail.com', passwordHash, systemRole: 'STUDENT', status: 'ACTIVE' } })
  const s2 = await prisma.user.create({ data: { fullName: 'Lê C', email: 'lec@gmail.com', passwordHash, systemRole: 'STUDENT', status: 'ACTIVE' } })
  const s3 = await prisma.user.create({ data: { fullName: 'Phạm D', email: 'phamd@gmail.com', passwordHash, systemRole: 'STUDENT', status: 'ACTIVE' } })
  const s4 = await prisma.user.create({ data: { fullName: 'Hoàng E', email: 'hoange@gmail.com', passwordHash, systemRole: 'STUDENT', status: 'ACTIVE' } }) // Treasurer

  // Add them to class 12A1
  await prisma.classMember.create({ data: { classId: class1.id, userId: s1.id, classRole: 'STUDENT' } })
  await prisma.classMember.create({ data: { classId: class1.id, userId: s2.id, classRole: 'STUDENT' } })
  await prisma.classMember.create({ data: { classId: class1.id, userId: s3.id, classRole: 'STUDENT' } })
  await prisma.classMember.create({ data: { classId: class1.id, userId: s4.id, classRole: 'TREASURER' } })

  console.log('Created students and class members')

  // Add some violations
  await prisma.violation.create({ data: { classId: class1.id, studentId: s1.id, violationTypeId: vt1.id, amount: 20000, note: 'Đi muộn 15p', createdBy: teacher.id } })
  await prisma.violation.create({ data: { classId: class1.id, studentId: s1.id, violationTypeId: vt2.id, amount: 50000, createdBy: teacher.id } })
  await prisma.violation.create({ data: { classId: class1.id, studentId: s2.id, violationTypeId: vt3.id, amount: 10000, createdBy: teacher.id } })
  
  // Add some transactions
  await prisma.fundTransaction.create({ data: { classId: class1.id, type: 'INCOME', amount: 2000000, description: 'Thu quỹ đầu năm', category: 'FUND_CONTRIBUTION', createdBy: teacher.id } })
  await prisma.fundTransaction.create({ data: { classId: class1.id, type: 'EXPENSE', amount: 500000, description: 'Mua phấn, giẻ lau bảng', category: 'SUPPLIES', createdBy: teacher.id } })
  
  // Student paying violation
  await prisma.fundTransaction.create({ data: { classId: class1.id, type: 'INCOME', amount: 20000, description: 'Trần B nộp tiền đi muộn', category: 'PENALTY_PAYMENT', studentId: s1.id, createdBy: teacher.id } })

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
