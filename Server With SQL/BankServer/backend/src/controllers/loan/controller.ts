import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import sequelize from "../../db/sequelize";
import BankAccount from "../../models/bankAccount";
import Loan from "../../models/loan";

type RequestLoanBody = {
  principal: number;
  months: number;
  annualRate: number;
};

function calcMonthlyPayment(principal: number, months: number, annualRate: number): number {
  // ריבית חודשית
  const r = annualRate / 100 / 12;

  if (r === 0) return principal / months;

  // נוסחת annuity
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export async function requestLoanController(
  req: Request<{}, {}, RequestLoanBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));
      return;
    }

    const principal = Number(req.body.principal);
    const months = Number(req.body.months);
    const annualRate = Number(req.body.annualRate);

    if (!Number.isFinite(principal) || principal <= 0) {
      next(new AppError(StatusCodes.BAD_REQUEST, "Invalid principal"));
      return;
    }
    if (!Number.isFinite(months) || months < 1 || months > 120) {
      next(new AppError(StatusCodes.BAD_REQUEST, "Invalid months"));
      return;
    }
    if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 50) {
      next(new AppError(StatusCodes.BAD_REQUEST, "Invalid annualRate"));
      return;
    }

    const monthlyPayment = calcMonthlyPayment(principal, months, annualRate);

    const result = await sequelize.transaction(async (t) => {
      const account = await BankAccount.findOne({
        where: { userId: req.user!.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!account) throw new AppError(StatusCodes.NOT_FOUND, "Account not found");

      // יצירת הלוואה
      const loan = await Loan.create(
        {
          userId: req.user!.id,
          principal,
          months,
          annualRate,
          monthlyPayment,
          status: "approved", // תתאים למה שיש אצלך בטבלה
        } as any,
        { transaction: t }
      );

      // להכניס כסף לחשבון (אם זה מה שאתה עושה אצלך)
      account.balance = Number(account.balance) + principal;
      await account.save({ transaction: t });

      return { loan, account };
    });

    res.json({
      message: "Loan approved ✅",
      loan: result.loan,
      balance: result.account.balance,
    });
  } catch (e: unknown) {
    if (e instanceof AppError) {
      next(e);
      return;
    }
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}