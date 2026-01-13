// require-role.ts
import { Request, Response, NextFunction } from "express";
import AppError from "../errors/app-error";
import { StatusCodes } from "http-status-codes";
import type { Role } from "../types/role";

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(StatusCodes.UNAUTHORIZED, "Missing token"));
    if (!allowed.includes(req.user.role)) return next(new AppError(StatusCodes.FORBIDDEN, "Forbidden"));
    next();
  };
}

export const requireAdmin = requireRole("admin");