// import sequelize from "../db/sequelize";
// import BankAccount from "../models/bankAccount";
// import Transaction, { TransactionType } from "../models/transaction";
// import AppError from "../errors/app-error";
// import { StatusCodes } from "http-status-codes";
// import { Transaction as SequelizeTx } from "sequelize";

// type TransferInput = {
//   fromUserId: string;
//   toAccountNumber: string;
//   amount: number; // נכנס כ-number, נשמור כ-DECIMAL
//   description?: string;
// };

// export async function transferMoney(input: TransferInput) {
//   const { fromUserId, toAccountNumber, amount, description } = input;

//   if (!Number.isFinite(amount) || amount <= 0) {
//     throw new AppError(StatusCodes.BAD_REQUEST, "Amount must be a positive number");
//   }

//   return sequelize.transaction(async (t: SequelizeTx) => {
//     // 1) מציאת חשבון מקור לפי userId
//     const fromAccount = await BankAccount.findOne({
//       where: { userId: fromUserId },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!fromAccount) {
//       throw new AppError(StatusCodes.NOT_FOUND, "Source bank account not found");
//     }

//     // 2) מציאת חשבון יעד לפי מספר חשבון
//     const toAccount = await BankAccount.findOne({
//       where: { accountNumber: toAccountNumber },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!toAccount) {
//       throw new AppError(StatusCodes.NOT_FOUND, "Target bank account not found");
//     }

//     if (toAccount.id === fromAccount.id) {
//       throw new AppError(StatusCodes.BAD_REQUEST, "Cannot transfer to the same account");
//     }

//     // 3) בדיקת יתרה
//     const fromBalance = Number(fromAccount.balance); // DECIMAL יכול להגיע כמחרוזת
//     if (fromBalance < amount) {
//       throw new AppError(StatusCodes.BAD_REQUEST, "Insufficient funds");
//     }

//     // 4) עדכון יתרות
//     fromAccount.balance = (fromBalance - amount) as any;

//     const toBalance = Number(toAccount.balance);
//     toAccount.balance = (toBalance + amount) as any;

//     await fromAccount.save({ transaction: t });
//     await toAccount.save({ transaction: t });

//     // 5) יצירת Transaction
//     const tx = await Transaction.create(
//       {
//         type: TransactionType.TRANSFER,
//         amount: amount.toFixed(2),
//         description: description ?? null,
//         fromAccountId: fromAccount.id,
//         toAccountId: toAccount.id,
//       } as any,
//       { transaction: t }
//     );

//     return {
//       transaction: tx,
//       fromAccount: {
//         id: fromAccount.id,
//         accountNumber: fromAccount.accountNumber,
//         balance: fromAccount.balance,
//       },
//       toAccount: {
//         id: toAccount.id,
//         accountNumber: toAccount.accountNumber,
//         balance: toAccount.balance,
//       },
//     };
//   });
// }


import sequelize from "../db/sequelize";
import BankAccount from "../models/bankAccount";
import Transaction, { TransactionType } from "../models/transaction";
import AppError from "../errors/app-error";
import { StatusCodes } from "http-status-codes";
import { Transaction as SequelizeTx } from "sequelize";

type TransferInput = {
  fromUserId: string;
  toAccountNumber: string;
  amount: number;
  description?: string;
};

// העברת כסף בין חשבונות
export async function transferMoney(input: TransferInput) {
  const { fromUserId, toAccountNumber, amount, description } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Amount must be a positive number");
  }

  return sequelize.transaction(async (t: SequelizeTx) => {
    const fromAccount = await BankAccount.findOne({
      where: { userId: fromUserId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!fromAccount) throw new AppError(StatusCodes.NOT_FOUND, "Source bank account not found");

    const toAccount = await BankAccount.findOne({
      where: { accountNumber: toAccountNumber },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!toAccount) throw new AppError(StatusCodes.NOT_FOUND, "Target bank account not found");

    if (toAccount.id === fromAccount.id) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Cannot transfer to the same account");
    }

    const fromBalance = Number(fromAccount.balance);
    if (fromBalance < amount) throw new AppError(StatusCodes.BAD_REQUEST, "Insufficient funds");

    fromAccount.balance = (fromBalance - amount) as any;

    const toBalance = Number(toAccount.balance);
    toAccount.balance = (toBalance + amount) as any;

    await fromAccount.save({ transaction: t });
    await toAccount.save({ transaction: t });

    const tx = await Transaction.create(
      {
        type: TransactionType.TRANSFER,
        amount: amount.toFixed(2),
        description: description ?? null,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
      } as any,
      { transaction: t }
    );

    return { transaction: tx };
  });
}

type DepositInput = {
  userId: string;
  amount: number;
  description?: string;
};

// הפקדת כסף לחשבון
export async function depositMoney(input: DepositInput) {
  const { userId, amount, description } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Amount must be a positive number");
  }

  return sequelize.transaction(async (t: SequelizeTx) => {
    const account = await BankAccount.findOne({
      where: { userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!account) throw new AppError(StatusCodes.NOT_FOUND, "Bank account not found");

    const currentBalance = Number(account.balance);
    account.balance = (currentBalance + amount) as any;
    await account.save({ transaction: t });

    const tx = await Transaction.create(
      {
        type: TransactionType.DEPOSIT,
        amount: amount.toFixed(2),
        description: description ?? null,
        fromAccountId: null,
        toAccountId: account.id,
      } as any,
      { transaction: t }
    );

    return { transaction: tx };
  });
}


// משיכת כסף מהחשבון
type WithdrawInput = {
  userId: string;
  amount: number;
  description?: string;
};

export async function withdrawMoney(input: WithdrawInput) {
  const { userId, amount, description } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Amount must be a positive number");
  }

  return sequelize.transaction(async (t: SequelizeTx) => {
    const account = await BankAccount.findOne({
      where: { userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!account) throw new AppError(StatusCodes.NOT_FOUND, "Bank account not found");

    const currentBalance = Number(account.balance);
    if (currentBalance < amount) throw new AppError(StatusCodes.BAD_REQUEST, "Insufficient funds");

    account.balance = (currentBalance - amount) as any;
    await account.save({ transaction: t });

    const tx = await Transaction.create(
      {
        type: TransactionType.WITHDRAW,
        amount: amount.toFixed(2),
        description: description ?? null,
        fromAccountId: account.id,
        toAccountId: null,
      } as any,
      { transaction: t }
    );

    return { transaction: tx };
  });
}