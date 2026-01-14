import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import AppError from "../../errors/app-error";
import BankAccount from "../../models/bankAccount";
import User from "../../models/user";

type DecideBody = { approve: boolean; note?: string };

export async function getPendingOverdraftRequests(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const accounts = await BankAccount.findAll({
      where: {
        overdraftRequestStatus: "pending",
        overdraftRequestedLimit: { [Op.ne]: null },
      },
      order: [["updatedAt", "DESC"]],
    });

    const userIds = Array.from(new Set(accounts.map((a) => a.userId)));

    const users = userIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: userIds } },
          attributes: ["id", "name", "userName", "email", "role"],
        })
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    res.json(
      accounts.map((a) => {
        const u = userMap.get(a.userId);
        return {
          accountId: a.id,
          accountNumber: a.accountNumber,
          userId: a.userId,
          user: u ? { id: u.id, name: u.name, userName: u.userName, email: u.email, role: u.role } : null,

          overdraftLimit: Number(a.overdraftLimit),
          requestedLimit: a.overdraftRequestedLimit ? Number(a.overdraftRequestedLimit) : null,
          requestStatus: a.overdraftRequestStatus,
          requestNote: a.overdraftRequestNote,

          balance: Number(a.balance),
          updatedAt: a.updatedAt,
        };
      })
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function approveOverdraftRequest(
  req: Request<{ accountId: string }, {}, { note?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { accountId } = req.params;
    const note = (req.body.note ?? "").trim();

    const acc = await BankAccount.findByPk(accountId);
    if (!acc) return void next(new AppError(StatusCodes.NOT_FOUND, "Account not found"));

    if (acc.overdraftRequestStatus !== "pending" || !acc.overdraftRequestedLimit) {
      return void next(new AppError(StatusCodes.BAD_REQUEST, "No pending request on this account"));
    }

    const pending = Number(acc.overdraftRequestedLimit);
    if (!Number.isFinite(pending) || pending < 0) {
      return void next(new AppError(StatusCodes.BAD_REQUEST, "Requested limit invalid"));
    }

    acc.overdraftLimit = pending.toFixed(2);
    acc.overdraftRequestedLimit = null;
    acc.overdraftRequestStatus = "approved";
    acc.overdraftRequestNote = note || acc.overdraftRequestNote;

    await acc.save();

    res.json({ message: "Approved ✅", overdraftLimit: Number(acc.overdraftLimit) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function rejectOverdraftRequest(
  req: Request<{ accountId: string }, {}, { note?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { accountId } = req.params;
    const note = (req.body.note ?? "").trim();

    const acc = await BankAccount.findByPk(accountId);
    if (!acc) return void next(new AppError(StatusCodes.NOT_FOUND, "Account not found"));

    if (acc.overdraftRequestStatus !== "pending") {
      return void next(new AppError(StatusCodes.BAD_REQUEST, "No pending request on this account"));
    }

    acc.overdraftRequestedLimit = null;
    acc.overdraftRequestStatus = "rejected";
    acc.overdraftRequestNote = note || acc.overdraftRequestNote;

    await acc.save();

    res.json({ message: "Rejected ❌" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

/**
 * אופציה מאוחדת אם אתה רוצה endpoint אחד:
 * POST /admin/overdraft/requests/:accountId
 * body: { approve: boolean, note?: string }
 */
export async function decideOverdraftRequest(
  req: Request<{ accountId: string }, {}, DecideBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.body.approve) return approveOverdraftRequest(req as any, res, next);
    return rejectOverdraftRequest(req as any, res, next);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}