import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import BankAccount from "../../models/bankAccount";

type RequestIncreaseBody = { requestedLimit: number; note?: string };

export async function getMyOverdraft(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return void next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));

    const account = await BankAccount.findOne({ where: { userId: req.user.id } });
    if (!account) return void next(new AppError(StatusCodes.NOT_FOUND, "Account not found"));

    const balance = Number(account.balance);
    const limit = Number(account.overdraftLimit);

    res.json({
      accountId: account.id,
      balance,
      overdraftLimit: limit,
      // כמה “נשאר” לפני שחוצים את המסגרת:
      remainingBeforeLimit: Math.max(0, balance + limit),
      request: {
        status: account.overdraftRequestStatus,
        requestedLimit: account.overdraftRequestedLimit ? Number(account.overdraftRequestedLimit) : null,
        note: account.overdraftRequestNote ?? null,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function requestOverdraftIncrease(
  req: Request<{}, {}, RequestIncreaseBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) return void next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));

    const { requestedLimit, note } = req.body;
    const n = Number(requestedLimit);

    if (!Number.isFinite(n) || n <= 0) {
      return void next(new AppError(StatusCodes.BAD_REQUEST, "requestedLimit must be positive"));
    }

    const account = await BankAccount.findOne({ where: { userId: req.user.id } });
    if (!account) return void next(new AppError(StatusCodes.NOT_FOUND, "Account not found"));

    account.overdraftRequestedLimit = String(n);
    account.overdraftRequestStatus = "pending";
    account.overdraftRequestNote = (note ?? "").trim() || null;
    await account.save();

    res.status(StatusCodes.CREATED).json({ message: "Request submitted ✅", requestedLimit: n });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}