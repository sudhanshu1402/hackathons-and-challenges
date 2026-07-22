import bcrypt from 'bcrypt';
import { config } from '../config/env';
export async function hashPassword(password: string) {
  return bcrypt.hash(password, config.bcryptSaltRounds);
}
export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
