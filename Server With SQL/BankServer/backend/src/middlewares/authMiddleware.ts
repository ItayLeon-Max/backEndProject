import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "config";
import AppError from "../errors/app-error";
import { StatusCodes } from "http-status-codes";

type UserPayload = {
  id: string;
  email?: string;
  role?: string;
  [key: string]: any;
};

type AuthedRequest = Request & { user?: UserPayload };

export function authenticateToken(req: AuthedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return next(new AppError(StatusCodes.UNAUTHORIZED, "Missing token"));
  }

  try {
    const decoded = jwt.verify(token, config.get<string>("app.jwtSecret")) as UserPayload;

    if (!decoded?.id) {
      return next(new AppError(StatusCodes.UNAUTHORIZED, "Invalid token payload"));
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    next(new AppError(StatusCodes.UNAUTHORIZED, "Invalid token"));
  }
}