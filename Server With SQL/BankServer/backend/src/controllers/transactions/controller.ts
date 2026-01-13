import { Request, Response, NextFunction } from "express";
import AppError from "../../errors/app-error";
import { StatusCodes } from "http-status-codes";
import { transferMoney, depositMoney, withdrawMoney } from "../../services/transaction.service";
import Transaction, { TransactionType } from "../../models/transaction";
import BankAccount from "../../models/bankAccount";
import { Op } from "sequelize";
import User from "../../models/user";

// ממשק לבקשה מאומתת
interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string; [key: string]: unknown };
}

type Direction = "in" | "out";

type TxResponseItem = {
  id: string;
  type: TransactionType;
  amount: string; // המקורי מהDB
  signedAmount: number; // +/- לפי כיוון
  direction: Direction;
  counterpartyName: string | null;
  description: string | null;
  createdAt: Date;
};

function toNumberSafe(v: unknown): number {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

// העברת כסף בין חשבונות
export async function transfer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const fromUserId = req.user.id;
    const { toAccountNumber, amount, description } = req.body as {
      toAccountNumber: string;
      amount: number;
      description?: string;
    };

    if (!toAccountNumber) {
      return next(new AppError(StatusCodes.BAD_REQUEST, "toAccountNumber is required"));
    }

    const result = await transferMoney({
      fromUserId,
      toAccountNumber,
      amount: Number(amount),
      description,
    });

    res.status(StatusCodes.CREATED).json(result);
  } catch (e) {
    next(e);
  }
}

// הפקדת כסף לחשבון
export async function deposit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user.id;
    const { amount, description } = req.body as { amount: number; description?: string };

    if (amount === undefined) {
      return next(new AppError(StatusCodes.BAD_REQUEST, "amount is required"));
    }

    const result = await depositMoney({
      userId,
      amount: Number(amount),
      description,
    });

    res.status(StatusCodes.CREATED).json(result);
  } catch (e) {
    next(e);
  }
}

// משיכת כסף מהחשבון
export async function withdraw(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user.id;
    const { amount, description } = req.body as { amount: number; description?: string };

    if (amount === undefined) {
      return next(new AppError(StatusCodes.BAD_REQUEST, "amount is required"));
    }

    const result = await withdrawMoney({
      userId,
      amount: Number(amount),
      description,
    });

    res.status(StatusCodes.CREATED).json(result);
  } catch (e) {
    next(e);
  }
}

// קבלת היסטוריית עסקאות של המשתמש
export async function getMyTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user.id;

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = (page - 1) * limit;

    const type = typeof req.query.type === "string" ? req.query.type : undefined;

    const myAccount = await BankAccount.findOne({ where: { userId } });
    if (!myAccount) return next(new AppError(StatusCodes.NOT_FOUND, "Bank account not found"));

    const where: Record<string, unknown> = {
      [Op.or]: [{ fromAccountId: myAccount.id }, { toAccountId: myAccount.id }],
    };

    if (type) where.type = type;

    const { rows, count } = await Transaction.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: BankAccount,
          as: "fromAccount",
          attributes: ["id", "accountNumber", "userId"],
          include: [{ model: User, as: "user", attributes: ["id", "name"] }],
        },
        {
          model: BankAccount,
          as: "toAccount",
          attributes: ["id", "accountNumber", "userId"],
          include: [{ model: User, as: "user", attributes: ["id", "name"] }],
        },
      ],
    });

    const items: TxResponseItem[] = rows.map((tx) => {
      const baseAmount = toNumberSafe(tx.amount);

      let signedAmount = baseAmount;
      let direction: Direction = "in";
      let counterpartyName: string | null = null;

      if (tx.type === TransactionType.DEPOSIT) {
        signedAmount = +baseAmount;
        direction = "in";
      } else if (tx.type === TransactionType.WITHDRAW) {
        signedAmount = -baseAmount;
        direction = "out";
      } else if (tx.type === TransactionType.TRANSFER) {
        // אם אני המקור => מינוס
        if (tx.fromAccountId === myAccount.id) {
          signedAmount = -baseAmount;
          direction = "out";
          counterpartyName = tx.toAccount?.user?.name ?? null;
        }

        // אם אני היעד => פלוס
        if (tx.toAccountId === myAccount.id) {
          signedAmount = +baseAmount;
          direction = "in";
          counterpartyName = tx.fromAccount?.user?.name ?? null;
        }
      }

      return {
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        signedAmount,
        direction,
        counterpartyName,
        description: tx.description ?? null,
        createdAt: tx.createdAt,
      };
    });

    res.json({
      page,
      limit,
      total: count,
      items,
    });
  } catch (e) {
    next(e);
  }
}