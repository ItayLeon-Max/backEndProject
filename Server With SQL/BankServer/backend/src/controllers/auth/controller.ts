import { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import sequelize from "../../db/sequelize";
import User from "../../models/user";
import BankAccount from "../../models/bankAccount";
import { sign } from "jsonwebtoken";
import config from "config";
import crypto from "crypto";

// ✅ אם כבר יש לך hashPassword קיים אצלך בקובץ הזה — תמחק את הפונקציה הזו ותשאיר את שלך
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// ✅ אם כבר יש לך פונקציה קיימת — תחליף רק את השם/נתיב בהתאם
async function generateUniqueAccountNumber(): Promise<string> {
  // מספר חשבון פשוט לדוגמה (תוכל לשפר)
  const num = Math.floor(10000000 + Math.random() * 90000000).toString();
  return num;
}

type RegisterBody = {
  name: string;
  username: string;
  password: string;
  email: string;
  role: string;
};

export const register: RequestHandler<{}, any, RegisterBody> = async (req, res, next) => {
  try {
    console.log("✅ REGISTER HIT", req.body);

    const { name, username, password, email, role } = req.body;

    const result = await sequelize.transaction(async (t) => {
      const user = await User.create(
        {
          name,
          userName: username,
          password: hashPassword(password),
          email,
          role,
        },
        { transaction: t }
      );

      const accountNumber = await generateUniqueAccountNumber();

      const account = await BankAccount.create(
        {
          accountNumber,
          balance: 0,
          userId: user.id,
        },
        { transaction: t }
      );

      const jwt = sign(user.get({ plain: true }), config.get<string>("app.jwtSecret"));

      return { user, account, jwt };
    });

    res.status(StatusCodes.CREATED).json({
      jwt: result.jwt,
      message: `Welcome ${result.user.name}!`,
      accountNumber: result.account.accountNumber,
    });

    return;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Register failed";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
    return;
  }
};

export const login: RequestHandler = async (_req, res) => {
  res.status(200).json({ message: "login placeholder" });
};