import { Request } from "express";
import AppError from "../errors/app-error";
import { StatusCodes } from "http-status-codes";

export function requireUser(req: Request) {
  if (!req.user?.id || !req.user.email || !req.user.role) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized");
  }
  return req.user;
}