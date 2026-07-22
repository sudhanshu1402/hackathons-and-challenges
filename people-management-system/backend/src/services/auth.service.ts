import { PrismaClient, Role } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/hash';
import { signJwt } from '../utils/jwt';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error('Invalid credentials');
  const valid = await comparePassword(password, user.password);
  if (!valid) throw new Error('Invalid credentials');
  const token = signJwt({ id: user.id, role: user.role });
  return { token, user: { id: user.id, username: user.username, role: user.role } };
}

export async function forgotPassword(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error('User not found');
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });
  // In production, send token via email. Here, return for demo.
  return token;
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });
  if (!user) throw new Error('Invalid or expired token');
  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetToken: null, resetTokenExpiry: null },
  });
}
