import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../utils/hash';

const prisma = new PrismaClient();

export async function createUser(username: string, password: string, role: Role) {
  const userCount = await prisma.user.count();
  if (userCount >= 3) throw new Error('Maximum 3 users allowed');
  const hashed = await hashPassword(password);
  return prisma.user.create({
    data: { username, password: hashed, role },
  });
}

export async function updateUser(id: number, data: Partial<{ username: string; password: string; role: Role }>) {
  if (data.password) data.password = await hashPassword(data.password);
  return prisma.user.update({
    where: { id },
    data,
  });
}

export async function deleteUser(id: number) {
  return prisma.user.delete({ where: { id } });
}

export async function listUsers() {
  return prisma.user.findMany({ select: { id: true, username: true, role: true, createdAt: true } });
}
