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

export async function transfer(req: Request<{}, {}, TransferBody>, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));

    const toAccountNumber = String(req.body.toAccountNumber ?? "").trim();
    const n = Number(req.body.amount);
    const description = (req.body.description ?? "").trim();

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

      // לא מאפשרים להעביר לעצמך לפי מספר חשבון
      if (fromAcc.accountNumber === toAccountNumber) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Cannot transfer to the same account");
      }

      const toAcc = await BankAccount.findOne({
        where: { accountNumber: toAccountNumber },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!toAcc) throw new AppError(StatusCodes.NOT_FOUND, "Target account not found");

      const fromBal = Number(fromAcc.balance);
      const toBal = Number(toAcc.balance);

      if (!Number.isFinite(fromBal) || !Number.isFinite(toBal)) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Account balance invalid");
      }

      if (fromBal < n) throw new AppError(StatusCodes.BAD_REQUEST, "Insufficient funds");

      // ✅ balance הוא string (DECIMAL) -> חייבים לשמור string
      fromAcc.balance = toMoneyString(fromBal - n);
      toAcc.balance = toMoneyString(toBal + n);

      await fromAcc.save({ transaction: t });
      await toAcc.save({ transaction: t });

      await Transaction.create(
        {
          type: "transfer",
          amount: toMoneyString(n),
          description: description || null,
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
        } as any,
        { transaction: t }
      );
    });

    res.json({ message: "Transfer completed ✅" });
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
    const description = (req.body.description ?? "").trim();

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

      const bal = Number(acc.balance);
      if (!Number.isFinite(bal)) throw new AppError(StatusCodes.BAD_REQUEST, "Account balance invalid");

      // ✅ balance הוא string
      acc.balance = toMoneyString(bal + n);
      await acc.save({ transaction: t });

      await Transaction.create(
        {
          type: "deposit",
          amount: toMoneyString(n),
          description: description || null,
          fromAccountId: null,
          toAccountId: acc.id,
        } as any,
        { transaction: t }
      );
    });

    res.json({ message: "Deposit completed ✅" });
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
    const description = (req.body.description ?? "").trim();

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

      const bal = Number(acc.balance);
      if (!Number.isFinite(bal)) throw new AppError(StatusCodes.BAD_REQUEST, "Account balance invalid");

      if (bal < n) throw new AppError(StatusCodes.BAD_REQUEST, "Insufficient funds");

      // ✅ balance הוא string
      acc.balance = toMoneyString(bal - n);
      await acc.save({ transaction: t });

      await Transaction.create(
        {
          type: "withdraw",
          amount: toMoneyString(n),
          description: description || null,
          fromAccountId: acc.id,
          toAccountId: null,
        } as any,
        { transaction: t }
      );
    });

    res.json({ message: "Withdraw completed ✅" });
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