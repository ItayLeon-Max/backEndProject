import { createHmac } from "crypto";
import { sign } from "jsonwebtoken";
import config from "config";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { UniqueConstraintError, ValidationError } from "sequelize";
import User from "../../models/user";
import BankAccount from "../../models/bankAccount";
import sequelize from "../../db/sequelize";
import AppError from "../../errors/app-error";
import { StatusCodes } from "http-status-codes";
import socket from "../../io/io";
import { generateUniqueAccountNumber } from "../../utils/generateAccountNumber";
import { sendMail } from "../../services/mail.service";
import type { Role } from "../../types/role";
import { toRole } from "../../types/role";

console.log("🔥 AUTH CONTROLLER FILE LOADED");

type RegisterBody = {
  name: string;
  username: string;
  password: string;
  email: string;
  role?: Role | string; // מאפשר גם "Admin"/"User" ישן
};

export function hashPassword(password: string): string {
  return createHmac("sha256", config.get<string>("app.secret")).update(password).digest("hex");
}

export async function getAllUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function login(
  req: Request<{}, {}, { username: string; password: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      where: {
        userName: username,
        password: hashPassword(password),
      },
    });

    if (!user) return next(new AppError(StatusCodes.UNAUTHORIZED, "wrong credentials"));

    const jwt = sign(user.get({ plain: true }), config.get<string>("app.jwtSecret"));

    socket.emit("user:login", {
      id: user.id,
      name: user.name,
      username: user.userName,
      time: new Date().toISOString(),
    });

    res.json({ jwt, message: `Welcome ${user.name}!` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export const register: RequestHandler<{}, any, RegisterBody> = async (req, res, next) => {
  try {
    const { name, username, password, email, role } = req.body;

    // ✅ role תמיד יהיה "user" / "admin"
    const normalizedRole: Role = toRole(role);

    const result = await sequelize.transaction(async (t) => {
      const user = await User.create(
        {
          name,
          userName: username,
          password: hashPassword(password),
          email,
          role: normalizedRole,
        },
        { transaction: t }
      );

      const accountNumber = await generateUniqueAccountNumber();

      const account = await BankAccount.create(
        { accountNumber, balance: 0, userId: user.id },
        { transaction: t }
      );

      const jwt = sign(user.get({ plain: true }), config.get<string>("app.jwtSecret"));
      return { user, account, jwt };
    });

    // מייל (לא מפיל הרשמה אם נכשל)
    try {
      await sendMail({
        to: result.user.email,
        subject: "Welcome to BankServer ✅",
        html: `
          <h2>ברוך הבא, ${result.user.name}!</h2>
          <p>ההרשמה בוצעה בהצלחה.</p>
          <p><b>שם משתמש:</b> ${result.user.userName}</p>
          <p><b>מספר חשבון:</b> ${result.account.accountNumber}</p>
          <p style="color:#888">מטעמי אבטחה, לא שולחים סיסמאות במייל.</p>
        `,
      });
    } catch (mailErr) {
      console.error("❌ SEND MAIL FAILED (REGISTER):", mailErr);
    }

    res.status(StatusCodes.CREATED).json({
      jwt: result.jwt,
      message: `Welcome ${result.user.name}!`,
      accountNumber: result.account.accountNumber,
    });
  } catch (e: unknown) {
    console.error("❌ REGISTER ERROR FULL:", e);

    if (e instanceof UniqueConstraintError) {
      const fields = Object.keys(e.fields ?? {});
      const field = fields[0] ?? "field";
      return next(new AppError(StatusCodes.CONFLICT, `${field} already exists`));
    }

    if (e instanceof ValidationError) {
      const msg = e.errors?.[0]?.message ?? "Validation error";
      return next(new AppError(StatusCodes.BAD_REQUEST, msg));
    }

    const msg = e instanceof Error ? e.message : "Server error";
    return next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
};

export async function updateUser(
  req: Request<{ id: string }, {}, { name: string; username: string; password: string; email: string; role: Role | string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { name, username, password, email, role } = req.body;

    const user = await User.findByPk(id);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "user not found"));

    user.name = name;
    user.userName = username;
    user.password = hashPassword(password);
    user.email = email;

    // ✅ זה התיקון לשגיאה שלך:
    user.role = toRole(role);

    await user.save();
    res.json(user);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function logout(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id: userId } = req.params;

    if (!userId) return next(new AppError(StatusCodes.BAD_REQUEST, "Missing userId"));

    const user = await User.findByPk(userId);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "User not found"));

    socket.emit("user:logout", {
      id: user.id,
      name: user.name,
      username: user.userName,
      time: new Date().toISOString(),
    });

    socket.emit("user:offline", {
      id: user.id,
      name: user.name,
      username: user.userName,
      time: new Date().toISOString(),
    });

    res.json({ message: `User ${user.name} logged out` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}