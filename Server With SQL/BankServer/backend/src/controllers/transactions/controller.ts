import { Request, Response, NextFunction } from "express";
import AppError from "../../errors/app-error";
import { StatusCodes } from "http-status-codes";
import { transferMoney, depositMoney, withdrawMoney } from "../../services/transaction.service";
import Transaction, { TransactionType } from "../../models/transaction";
import BankAccount from "../../models/bankAccount";
import { Op } from "sequelize";

// ממשק לבקשה מאומתת
interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string; [key: string]: any };
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

    const type = req.query.type as string | undefined;

    const account = await BankAccount.findOne({ where: { userId } });
    if (!account) return next(new AppError(StatusCodes.NOT_FOUND, "Bank account not found"));

    const where: any = {
      [Op.or]: [{ fromAccountId: account.id }, { toAccountId: account.id }],
    };

    if (type) where.type = type;

    const { rows, count } = await Transaction.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      page,
      limit,
      total: count,
      items: rows,
    });
  } catch (e) {
    next(e);
  }
}