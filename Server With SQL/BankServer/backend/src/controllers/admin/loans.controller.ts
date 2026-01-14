import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import AppError from "../../errors/app-error";
import sequelize from "../../db/sequelize";

import User from "../../models/user";
import BankAccount from "../../models/bankAccount";
import Loan from "../../models/loan";
import Transaction from "../../models/transaction";
import LoanPayment, { LoanPaymentStatus } from "../../models/loanPayment";

type LateFeeBody = {
  percent: number; // 0-100
  note?: string;
};

/**
 * GET /admin/users/:id/loans
 * מחזיר סקירה של הלוואות לפי משתמש:
 * - מוצא את כל החשבונות שלו
 * - מוצא את כל ההלוואות לפי accountId
 * - מחשב "פיגור" לפי loan_payments:
 *   1) status = late
 *   2) או status = pending && dueDate < now
 *
 * חשוב:
 * כדי שזה יעבוד, במודל LoanPayment חייב להיות:
 * dueDate => field: "due_date"
 * loanId  => field: "loan_id"
 */
export async function getUserLoansOverview(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.params.id;

    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "userName", "email", "role"],
    });
    if (!user) {
      return next(new AppError(StatusCodes.NOT_FOUND, "User not found"));
    }

    const accounts = await BankAccount.findAll({
      where: { userId },
      attributes: ["id", "accountNumber", "balance", "userId", "createdAt"],
    });

    const accountIds = accounts.map(a => a.id);

    const loans = accountIds.length
      ? await Loan.findAll({
          where: { accountId: { [Op.in]: accountIds } },
          order: [["createdAt", "DESC"]],
        })
      : [];

    const loanIds = loans.map(l => l.id);

    const payments = loanIds.length
      ? await LoanPayment.findAll({
          where: { loanId: { [Op.in]: loanIds } },
          order: [["dueDate", "ASC"]],
        })
      : [];

    const paymentsByLoan = new Map<string, LoanPayment[]>();
    for (const p of payments) {
      if (!paymentsByLoan.has(p.loanId)) {
        paymentsByLoan.set(p.loanId, []);
      }
      paymentsByLoan.get(p.loanId)!.push(p);
    }

    let delinquentLoans = 0;

    const loanItems = loans.map(l => {
      const p = paymentsByLoan.get(l.id) ?? [];

      const latePayments = p.filter(x => x.status === LoanPaymentStatus.LATE);
      const pendingOverdue = p.filter(
        x => x.status === LoanPaymentStatus.PENDING && x.dueDate < new Date()
      );

      const isLate = latePayments.length > 0 || pendingOverdue.length > 0;
      if (isLate) delinquentLoans++;

      const allLate = [...latePayments, ...pendingOverdue].sort(
        (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
      );

      const nextPending = p.find(x => x.status === LoanPaymentStatus.PENDING);
      const lastPaid = [...p]
        .filter(x => x.status === LoanPaymentStatus.PAID)
        .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())[0];

      return {
        id: l.id,
        accountId: l.accountId,
        principal: Number(l.principal),
        remainingPrincipal: Number(l.remainingPrincipal),
        annualInterestRate: Number(l.annualInterestRate),
        termMonths: l.termMonths,
        monthlyPayment: Number(l.monthlyPayment),
        status: l.status,
        startDate: l.startDate,
        note: l.note,

        // ✅ מה שה־UI צריך
        isLate,
        lateCount: allLate.length,
        lateSince: allLate[0]?.dueDate ?? null,
        nextDueDate: nextPending?.dueDate ?? null,
        lastPaymentAt: lastPaid?.paidAt ?? null,
      };
    });

    res.json({
      user,
      accounts,
      delinquentLoans,
      loans: loanItems,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

/**
 * POST /admin/users/:id/loans/:loanId/late-fee
 * מחייב עמלה באחוזים ומוריד מהחשבון של ההלוואה.
 * נשמר כ-Transaction מסוג withdraw.
 */
export async function chargeLateFee(
  req: Request<{ id: string; loanId: string }, {}, LateFeeBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.params.id;
    const loanId = req.params.loanId;

    const percent = Number(req.body.percent);
    const note = (req.body.note ?? "").trim();

    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return void next(new AppError(StatusCodes.BAD_REQUEST, "percent must be between 0 and 100"));
    }

    let chargedFee = 0;

    await sequelize.transaction(async (t) => {
      const loan = await Loan.findByPk(loanId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!loan) throw new AppError(StatusCodes.NOT_FOUND, "Loan not found");

      const account = await BankAccount.findByPk(loan.accountId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!account) throw new AppError(StatusCodes.NOT_FOUND, "Account not found");

      if (account.userId !== userId) {
        throw new AppError(StatusCodes.FORBIDDEN, "Loan does not belong to this user");
      }

      const remaining = Number(loan.remainingPrincipal);
      const base = Number.isFinite(remaining) && remaining > 0 ? remaining : Number(loan.principal);

      const fee = Number((base * (percent / 100)).toFixed(2));
      if (!Number.isFinite(fee) || fee <= 0) throw new AppError(StatusCodes.BAD_REQUEST, "Calculated fee is invalid");

      const bal = Number(account.balance);
      if (!Number.isFinite(bal)) throw new AppError(StatusCodes.BAD_REQUEST, "Account balance invalid");
      if (bal < fee) throw new AppError(StatusCodes.BAD_REQUEST, "Insufficient funds for late fee");

      account.balance = bal - fee;
      await account.save({ transaction: t });

      await Transaction.create(
        {
          type: "withdraw",
          amount: String(fee),
          description: note || `Late fee ${percent}% (loan ${loan.id})`,
          fromAccountId: account.id,
          toAccountId: null,
        } as any,
        { transaction: t }
      );

      chargedFee = fee;
    });

    res.json({ message: "Late fee charged ✅", fee: chargedFee });
  } catch (e: unknown) {
    if (e instanceof AppError) return void next(e);
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}