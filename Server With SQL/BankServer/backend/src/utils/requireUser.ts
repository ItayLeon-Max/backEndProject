import { Request } from "express";
import AppError from "../errors/app-error";
import { StatusCodes } from "http-status-codes";
import type { UserPayload } from "../types/express-augment";

export function requireUser(req: Request): UserPayload {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized");
  }
  return req.user;
}