import { Transaction as SequelizeTx } from "sequelize";
import { StatusCodes } from "http-status-codes";
import sequelize from "../db/sequelize";
import AppError from "../errors/app-error";
import BankAccount from "../models/bankAccount";
import Loan, { LoanStatus } from "../models/loan";
import Transaction, { TransactionType } from "../models/transaction";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function calcMonthlyPayment(principal: number, annualRatePct: number, months: number) {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return round2(principal / months);
  return round2((principal * r) / (1 - Math.pow(1 + r, -months)));
}

type LoanRequestInput = {
  userId: string;
  principal: number;
  months: number;
  annualRate: number;
};

export async function requestLoan(input: LoanRequestInput) {
  const { userId, principal, months, annualRate } = input;

  if (principal <= 0) throw new AppError(StatusCodes.BAD_REQUEST, "Invalid principal");
  if (months < 1 || months > 120) throw new AppError(StatusCodes.BAD_REQUEST, "Invalid months");
  if (annualRate < 0 || annualRate > 50) throw new AppError(StatusCodes.BAD_REQUEST, "Invalid rate");

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
        annualInterestRate: annualRate.toFixed(3),
        termMonths: months,
        monthlyPayment: monthlyPayment.toFixed(2),
        remainingPrincipal: principal.toFixed(2),
        status: LoanStatus.ACTIVE,
        startDate: new Date(),
      } as any,
      { transaction: t }
    );

    // מזכים את החשבון
    account.balance = (Number(account.balance) + principal) as any;
    await account.save({ transaction: t });

    await Transaction.create(
      {
        type: TransactionType.DEPOSIT,
        amount: principal.toFixed(2),
        description: `Loan disbursement (${loan.id})`,
        fromAccountId: null,
        toAccountId: account.id,
      } as any,
      { transaction: t }
    );

    return {
      loan: {
        id: loan.id,
        monthlyPayment: loan.monthlyPayment,
        remainingPrincipal: loan.remainingPrincipal,
        status: loan.status,
      },
    };
  });
}