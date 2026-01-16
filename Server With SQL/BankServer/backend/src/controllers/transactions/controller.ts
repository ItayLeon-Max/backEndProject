import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import AppError from "../../errors/app-error";
import Transaction from "../../models/transaction";
import BankAccount from "../../models/bankAccount";
import sequelize from "../../db/sequelize";

type TransferBody = {
  toAccountNumber: string;
  amount: number;
  description?: string;
};

type SimpleTxBody = {
  amount: number;
  description?: string;
};

function toMoneyString(n: number): string {
  return Number(n).toFixed(2);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// ✅ בדיקת מסגרת עו"ש: מותר לרדת עד -overdraftLimit
function ensureWithinOverdraft(balance: number, overdraftLimit: number, debit: number) {
  const newBalance = balance - debit;
  const minAllowed = -Math.max(0, overdraftLimit); // אם limit שלילי/NaN -> נתייחס כ-0
  if (newBalance < minAllowed) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Insufficient funds (overdraft limit exceeded)");
  }
}

export async function transfer(req: Request<{}, {}, TransferBody>, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));

    const { toAccountNumber, amount, description } = req.body;
    const n = Number(amount);

    if (!toAccountNumber || !Number.isFinite(n) || n <= 0) {
      return next(new AppError(StatusCodes.BAD_REQUEST, "Invalid transfer data"));
    }

    await sequelize.transaction(async (t) => {
      const fromAcc = await BankAccount.findOne({
        where: { userId: req.user!.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!fromAcc) throw new AppError(StatusCodes.NOT_FOUND, "Your account not found");

      const toAcc = await BankAccount.findOne({
        where: { accountNumber: toAccountNumber },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!toAcc) throw new AppError(StatusCodes.NOT_FOUND, "Target account not found");

      const fromBal = num(fromAcc.balance);
      const fromLimit = num((fromAcc as any).overdraftLimit); // אמור להיות קיים אצלך במודל
      if (!Number.isFinite(fromBal)) throw new AppError(StatusCodes.BAD_REQUEST, "Account balance invalid");
      if (!Number.isFinite(fromLimit)) throw new AppError(StatusCodes.BAD_REQUEST, "Overdraft limit invalid");

      // ✅ מאפשרים מינוס במסגרת
      ensureWithinOverdraft(fromBal, fromLimit, n);

      const toBal = num(toAcc.balance);
      if (!Number.isFinite(toBal)) throw new AppError(StatusCodes.BAD_REQUEST, "Target balance invalid");

      fromAcc.balance = toMoneyString(fromBal - n);
      toAcc.balance = toMoneyString(toBal + n);

      await fromAcc.save({ transaction: t });
      await toAcc.save({ transaction: t });

      await Transaction.create(
        {
          type: "transfer",
          amount: toMoneyString(n),
          description: description ?? null,
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
        } as any,
        { transaction: t }
      );
    });

    res.json({ message: "Transfer completed" });
  } catch (e: unknown) {
    if (e instanceof AppError) return next(e);
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function deposit(req: Request<{}, {}, SimpleTxBody>, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));

    const n = Number(req.body.amount);
    const description = req.body.description;

    if (!Number.isFinite(n) || n <= 0) {
      return next(new AppError(StatusCodes.BAD_REQUEST, "Invalid amount"));
    }

    await sequelize.transaction(async (t) => {
      const acc = await BankAccount.findOne({
        where: { userId: req.user!.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!acc) throw new AppError(StatusCodes.NOT_FOUND, "Account not found");

      const bal = num(acc.balance);
      if (!Number.isFinite(bal)) throw new AppError(StatusCodes.BAD_REQUEST, "Account balance invalid");

      acc.balance = toMoneyString(bal + n);
      await acc.save({ transaction: t });

      await Transaction.create(
        {
          type: "deposit",
          amount: toMoneyString(n),
          description: description ?? null,
          fromAccountId: null,
          toAccountId: acc.id,
        } as any,
        { transaction: t }
      );
    });

    res.json({ message: "Deposit completed" });
  } catch (e: unknown) {
    if (e instanceof AppError) return next(e);
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function withdraw(req: Request<{}, {}, SimpleTxBody>, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));

    const n = Number(req.body.amount);
    const description = req.body.description;

    if (!Number.isFinite(n) || n <= 0) {
      return next(new AppError(StatusCodes.BAD_REQUEST, "Invalid amount"));
    }

    await sequelize.transaction(async (t) => {
      const acc = await BankAccount.findOne({
        where: { userId: req.user!.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!acc) throw new AppError(StatusCodes.NOT_FOUND, "Account not found");

      const bal = num(acc.balance);
      const limit = num((acc as any).overdraftLimit);
      if (!Number.isFinite(bal)) throw new AppError(StatusCodes.BAD_REQUEST, "Account balance invalid");
      if (!Number.isFinite(limit)) throw new AppError(StatusCodes.BAD_REQUEST, "Overdraft limit invalid");

      // ✅ במקום: if (bal < n) ...
      ensureWithinOverdraft(bal, limit, n);

      acc.balance = toMoneyString(bal - n);
      await acc.save({ transaction: t });

      await Transaction.create(
        {
          type: "withdraw",
          amount: toMoneyString(n),
          description: description ?? null,
          fromAccountId: acc.id,
          toAccountId: null,
        } as any,
        { transaction: t }
      );
    });

    res.json({ message: "Withdraw completed" });
  } catch (e: unknown) {
    if (e instanceof AppError) return next(e);
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function getMyTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));

    const myAcc = await BankAccount.findOne({ where: { userId: req.user.id } });
    if (!myAcc) return next(new AppError(StatusCodes.NOT_FOUND, "Account not found"));

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 8);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 50 ? limit : 8;
    const offset = (safePage - 1) * safeLimit;

    const { rows, count } = await Transaction.findAndCountAll({
      where: {
        [Op.or]: [{ fromAccountId: myAcc.id }, { toAccountId: myAcc.id }],
      },
      order: [["createdAt", "DESC"]],
      limit: safeLimit,
      offset,
    });

    res.json({
      items: rows,
      page: safePage,
      limit: safeLimit,
      total: count,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}