import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, role } = req.body;
    const user = await userService.createUser(username, password, role);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await userService.updateUser(Number(id), req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await userService.deleteUser(Number(id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}
