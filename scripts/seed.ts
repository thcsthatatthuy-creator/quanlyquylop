import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { systemRole: 'ADMIN' },
  })
  if (existingAdmin) {
    console.log('Admin already exists:', existingAdmin.email)
    return
  }

  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      fullName: 'Quản trị viên',
      email: 'admin@lopfund.vn',
      passwordHash,
      systemRole: 'ADMIN',
      status: 'ACTIVE',
    },
  })
  console.log('Seeded default admin:', admin.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
