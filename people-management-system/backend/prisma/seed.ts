import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: await bcrypt.hash('admin123', 12),
        role: Role.ADMIN,
      },
    });
    console.log('Admin user created: admin / admin123');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
