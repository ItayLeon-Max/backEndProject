import { Op, Transaction as SequelizeTx } from "sequelize";
import sequelize from "../db/sequelize";
import BankAccount from "../models/bankAccount";
import Loan, { LoanStatus } from "../models/loan";
import LoanPayment, { LoanPaymentStatus } from "../models/loanPayment";
import Transaction, { TransactionType } from "../models/transaction";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function processDueLoanPayments() {
  const now = new Date();

  // נביא תשלומים שהגיע מועד ועדיין לא שולמו
  const duePayments = await LoanPayment.findAll({
    where: {
      dueDate: { [Op.lte]: now },
      status: { [Op.in]: [LoanPaymentStatus.PENDING, LoanPaymentStatus.LATE] },
    },
    order: [["dueDate", "ASC"]],
    limit: 200, // כדי לא להפיל שרת אם יש הרבה
  });

  let paid = 0;
  let late = 0;
  let skipped = 0;

  for (const p of duePayments) {
    try {
      const r = await tryPaySingleInstallment(p.id);
      if (r === "paid") paid++;
      else if (r === "late") late++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  return { paid, late, skipped };
}

async function tryPaySingleInstallment(paymentId: string): Promise<"paid" | "late" | "skipped"> {
  return sequelize.transaction(async (t: SequelizeTx) => {
    const payment = await LoanPayment.findByPk(paymentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!payment) return "skipped";

    // אולי כבר שולם במקביל
    if (payment.status === LoanPaymentStatus.PAID) return "skipped";

    const loan = await Loan.findByPk(payment.loanId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!loan) return "skipped";

    if (loan.status !== LoanStatus.ACTIVE) return "skipped";

    const account = await BankAccount.findByPk(loan.accountId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!account) return "skipped";

    const amountDue = Number(payment.amountDue);
    const bal = Number(account.balance);

    // אין כסף → late (ננסה שוב מחר)
    if (bal < amountDue) {
      payment.status = LoanPaymentStatus.LATE;
      await payment.save({ transaction: t });
      return "late";
    }

    // 1) מורידים כסף מהחשבון
    account.balance = round2(bal - amountDue) as any;
    await account.save({ transaction: t });

    // 2) שומרים Transaction (כמשיכה)
    await Transaction.create(
      {
        type: TransactionType.WITHDRAW,
        amount: amountDue.toFixed(2),
        description: `Loan payment (${loan.id})`,
        fromAccountId: account.id,
        toAccountId: null,
      } as any,
      { transaction: t }
    );

    // 3) מסמנים payment כ-paid
    payment.status = LoanPaymentStatus.PAID;
    payment.paidAt = new Date();
    await payment.save({ transaction: t });

    // 4) מורידים מהיתרה של ההלוואה רק את חלק הקרן
    const remaining = Number(loan.remainingPrincipal);
    const principalPart = Number(payment.principalPart);

    const newRemaining = round2(Math.max(0, remaining - principalPart));
    loan.remainingPrincipal = newRemaining.toFixed(2);

    // אם נגמרה הקרן → סוגרים הלוואה
    if (newRemaining <= 0) {
      loan.status = LoanStatus.CLOSED;
    }

    await loan.save({ transaction: t });

    return "paid";
  });
}