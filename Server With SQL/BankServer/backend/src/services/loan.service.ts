 import { Transaction as SequelizeTx } from "sequelize";
import { StatusCodes } from "http-status-codes";
import sequelize from "../db/sequelize";
import AppError from "../errors/app-error";
import BankAccount from "../models/bankAccount";
import Loan from "../models/loan";
import Transaction, { TransactionType } from "../models/transaction";

type LoanRequestInput = {
  userId: string;
  principal: number;
  months: number;
  annualRate: number; // אחוזים
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function calcMonthlyPayment(principal: number, annualRatePct: number, months: number) {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return round2(principal / months);
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -months));
  return round2(pmt);
}

export async function requestLoan(input: LoanRequestInput) {
  const { userId, principal, months, annualRate } = input;

  if (!Number.isFinite(principal) || principal <= 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "principal must be a positive number");
  }
  if (!Number.isFinite(months) || months < 1 || months > 120) {
    throw new AppError(StatusCodes.BAD_REQUEST, "months must be between 1 and 120");
  }
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 50) {
    throw new AppError(StatusCodes.BAD_REQUEST, "annualRate must be between 0 and 50");
  }

  return sequelize.transaction(async (t: SequelizeTx) => {
    const account = await BankAccount.findOne({
      where: { userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!account) throw new AppError(StatusCodes.NOT_FOUND, "Bank account not found");

    const monthlyPayment = calcMonthlyPayment(principal, annualRate, months);

    const loan = await Loan.create(
      {
        accountId: account.id,
        principal: principal.toFixed(2),
        annualRate: annualRate.toFixed(2),
        months,
        monthlyPayment: monthlyPayment.toFixed(2),
      } as any,
      { transaction: t }
    );

    const bal = Number(account.balance);
    account.balance = (bal + principal) as any;
    await account.save({ transaction: t });

    await Transaction.create(
      {
        type: TransactionType.DEPOSIT,
        amount: principal.toFixed(2),
        description: `Loan disbursement (loanId: ${loan.id})`,
        fromAccountId: null,
        toAccountId: account.id,
      } as any,
      { transaction: t }
    );

    return {
      loan: {
        id: loan.id,
        principal: loan.principal,
        annualRate: loan.annualRate,
        months: loan.months,
        monthlyPayment: loan.monthlyPayment,
        status: loan.status,
        createdAt: loan.createdAt,
      },
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        balance: account.balance,
      },
    };
  });
}