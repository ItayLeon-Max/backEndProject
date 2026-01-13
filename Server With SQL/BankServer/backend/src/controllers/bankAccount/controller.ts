import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import BankAccount from "../../models/bankAccount";

export async function getMyAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));
      return;
    }

    const account = await BankAccount.findOne({
      where: { userId: req.user.id },
    });

    if (!account) {
      next(new AppError(StatusCodes.NOT_FOUND, "Account not found"));
      return;
    }

    res.json(account);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}