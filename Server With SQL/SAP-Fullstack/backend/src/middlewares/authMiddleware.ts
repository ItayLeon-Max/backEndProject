import { Request, Response, NextFunction } from "express";
import { verify } from "jsonwebtoken";
import config from "config";
import AppError from "../errors/app-error";
import { StatusCodes } from "http-status-codes";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    [key: string]: any;
  };
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next(
        new AppError(StatusCodes.UNAUTHORIZED, "Missing Authorization header")
      );
    }

    const [, token] = authHeader.split(" ");

    if (!token) {
      return next(
        new AppError(StatusCodes.UNAUTHORIZED, "Missing token")
      );
    }

    const payload = verify(
      token,
      config.get<string>("app.jwtSecret")
    ) as any;

    // שומרים את המשתמש על הבקשה
    req.user = payload;

    next();
  } catch (e: any) {
    return next(
      new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired token")
    );
  }
}