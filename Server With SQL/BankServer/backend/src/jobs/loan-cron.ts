import cron from "node-cron";
import { processDueLoanPayments } from "../services/loan-cron.service";

// ירוץ כל יום ב-02:00 בלילה (אפשר לשנות)
const CRON_EXPR = "0 2 * * *";
const TZ = "Asia/Jerusalem";

let started = false;

export function startLoanCron() {
  if (started) return;
  started = true;

  console.log(`🕒 Loan Cron scheduled: "${CRON_EXPR}" (${TZ})`);

  cron.schedule(
    CRON_EXPR,
    async () => {
      console.log("🧾 Loan Cron tick: checking due payments...");
      try {
        const result = await processDueLoanPayments();
        console.log(
          `✅ Loan Cron done: paid=${result.paid}, late=${result.late}, skipped=${result.skipped}`
        );
      } catch (e: any) {
        console.log("❌ Loan Cron error:", e?.message ?? e);
      }
    },
    { timezone: TZ }
  );
}