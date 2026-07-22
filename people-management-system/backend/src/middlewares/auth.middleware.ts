import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';
export interface AuthRequest extends Request {
  user?: { id: number; role: string };
}
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = verifyJwt(token) as any;
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
