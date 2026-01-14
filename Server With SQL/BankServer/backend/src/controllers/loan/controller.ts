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
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export async function requestLoanController(
  req: Request<{}, {}, RequestLoanBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) return void next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));

    const principal = Number(req.body.principal);
    const months = Number(req.body.months);
    const annualRate = Number(req.body.annualRate);

    if (!Number.isFinite(principal) || principal <= 0) {
      return void next(new AppError(StatusCodes.BAD_REQUEST, "Invalid principal"));
    }
    if (!Number.isFinite(months) || months < 1 || months > 120) {
      return void next(new AppError(StatusCodes.BAD_REQUEST, "Invalid months"));
    }
    if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 50) {
      return void next(new AppError(StatusCodes.BAD_REQUEST, "Invalid annualRate"));
    }

    const monthlyPayment = calcMonthlyPayment(principal, months, annualRate);

    const result = await sequelize.transaction(async (t) => {
      const account = await BankAccount.findOne({
        where: { userId: req.user!.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!account) throw new AppError(StatusCodes.NOT_FOUND, "Account not found");

      const bal = Number(account.balance);
      if (!Number.isFinite(bal)) throw new AppError(StatusCodes.BAD_REQUEST, "Account balance invalid");

      const loan = await Loan.create(
        {
          accountId: account.id,
          principal: principal.toFixed(2),
          remainingPrincipal: principal.toFixed(2),
          annualInterestRate: annualRate.toFixed(2),
          termMonths: months,
          monthlyPayment: monthlyPayment.toFixed(2),
          status: "active", // אם אצלך זה approved אז שנה ל-"approved"
          startDate: new Date(),
          note: null,
        } as any,
        { transaction: t }
      );

      account.balance = (bal + principal).toFixed(2);
      await account.save({ transaction: t });

      return { loan, account };
    });

    res.json({
      message: "Loan approved ✅",
      loan: result.loan,
      balance: result.account.balance,
    });
  } catch (e: unknown) {
    if (e instanceof AppError) return void next(e);
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}