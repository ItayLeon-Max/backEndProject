import { Response, NextFunction } from "express";
import BankAccount from "../../models/bankAccount";
import AppError from "../../errors/app-error";
import { StatusCodes } from "http-status-codes";
import { Request } from "express";

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string; [key: string]: any };
}

export async function getMyAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user.id;

    const account = await BankAccount.findOne({
      where: { userId },
      attributes: ["id", "accountNumber", "balance", "userId", "createdAt", "updatedAt"],
    });

    if (!account) {
      return next(new AppError(StatusCodes.NOT_FOUND, "Bank account not found"));
    }

    res.json(account);
  } catch (e: any) {
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}