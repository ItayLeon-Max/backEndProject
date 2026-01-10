import BankAccount from "../models/bankAccount";

function random8Digits(): string {
  return String(Math.floor(10_000_000 + Math.random() * 90_000_000));
}

export async function generateUniqueAccountNumber(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = random8Digits();
    const exists = await BankAccount.findOne({ where: { accountNumber: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("Failed to generate unique account number");
}