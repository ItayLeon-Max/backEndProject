import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "config";
import AppError from "../errors/app-error";
import { StatusCodes } from "http-status-codes";
import { toRole } from "../types/role";

export function authenticateToken(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return next(new AppError(StatusCodes.UNAUTHORIZED, "Missing token"));

  try {
    const decoded = jwt.verify(token, config.get<string>("app.jwtSecret")) as {
      id: string;
      email: string;
      role: unknown;
      name?: string;
      [key: string]: unknown;
    };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: toRole(decoded.role),
      name: decoded.name,
    };

    next();
  } catch {
    next(new AppError(StatusCodes.UNAUTHORIZED, "Invalid token"));
  }
}