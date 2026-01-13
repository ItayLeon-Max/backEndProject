import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import User from "../../models/user";
import type { Role } from "../../types/role";
import { toRole } from "../../types/role";

export async function getAllUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "userName", "email", "role", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    res.json(users);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function updateUserRole(
  req: Request<{ id: string }, {}, { role: Role }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const role = toRole(req.body.role);

    const user = await User.findByPk(id);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "User not found"));

    user.role = role;
    await user.save();

    res.json({ id: user.id, role: user.role });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function deleteUser(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "User not found"));

    await user.destroy();
    res.json({ message: "User deleted" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}