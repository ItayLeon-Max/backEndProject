import cron from "node-cron";
import sequelize from "../db/sequelize";
import BankAccount from "../models/bankAccount";
import Transaction from "../models/transaction";

// אם עבר מסגרת ב-X, עמלה חודשית = 20₪ בסיס + 1% מהחריגה
function calcMonthlyFee(exceededBy: number): number {
  const base = 20;
  const variable = exceededBy * 0.01; // 1%
  return Number((base + variable).toFixed(2));
}

export function startOverdraftFeeJob() {
  // כל 1 לחודש ב-00:05
  cron.schedule("5 0 1 * *", async () => {
    const today = new Date().toISOString().slice(0, 10);

    const accounts = await BankAccount.findAll();

    for (const acc of accounts) {
      const bal = Number(acc.balance);
      const limit = Number(acc.overdraftLimit);

      if (!Number.isFinite(bal) || !Number.isFinite(limit)) continue;

      const used = bal < 0 ? Math.abs(bal) : 0;
      const exceededBy = Math.max(0, used - limit);

      if (exceededBy <= 0) continue;

      const fee = calcMonthlyFee(exceededBy);
      if (fee <= 0) continue;

      await sequelize.transaction(async (t) => {
        const locked = await BankAccount.findByPk(acc.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!locked) return;

        const lockedBal = Number(locked.balance);
        if (!Number.isFinite(lockedBal)) return;

        // ✅ balance הוא string
        locked.balance = (lockedBal - fee).toFixed(2);
        await locked.save({ transaction: t });

        await Transaction.create(
          {
            type: "withdraw",
            amount: String(fee),
            description: `Overdraft fee (exceeded by ${exceededBy.toFixed(2)}) - ${today}`,
            fromAccountId: locked.id,
            toAccountId: null,
          },
          { transaction: t }
        );
      });
    }
  });
}