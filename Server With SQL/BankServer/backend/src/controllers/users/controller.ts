import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import User from "../../models/user";
import { hashPassword } from "../auth/controller";
import { sign } from "jsonwebtoken";
import config from "config";
import { sendMail } from "../../services/mail.service";

type UpdateMeBody = { name?: string; username?: string; email?: string };
type ChangePasswordBody = { currentPassword: string; newPassword: string };

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));
      return;
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "userName", "email", "role", "createdAt", "updatedAt"],
    });

    if (!user) {
      next(new AppError(StatusCodes.NOT_FOUND, "User not found"));
      return;
    }

    res.json(user);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function updateMe(
  req: Request<{}, {}, UpdateMeBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.id) {
      next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));
      return;
    }

    const { name, username, email } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      next(new AppError(StatusCodes.NOT_FOUND, "User not found"));
      return;
    }

    if (username && username !== user.userName) {
      const exists = await User.findOne({ where: { userName: username } });
      if (exists) {
        next(new AppError(StatusCodes.CONFLICT, "Username already taken"));
        return;
      }
      user.userName = username;
    }

    if (email && email !== user.email) {
      const exists = await User.findOne({ where: { email } });
      if (exists) {
        next(new AppError(StatusCodes.CONFLICT, "Email already taken"));
        return;
      }
      user.email = email;
    }

    if (name) user.name = name;

    await user.save();

    const jwt = sign(user.get({ plain: true }), config.get<string>("app.jwtSecret"));

    res.json({
      message: "Profile updated",
      jwt,
      user: { id: user.id, name: user.name, username: user.userName, email: user.email, role: user.role },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function changeMyPassword(
  req: Request<{}, {}, ChangePasswordBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.id) {
      next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      next(new AppError(StatusCodes.BAD_REQUEST, "currentPassword and newPassword are required"));
      return;
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      next(new AppError(StatusCodes.NOT_FOUND, "User not found"));
      return;
    }

    const currentHash = hashPassword(currentPassword);
    if (user.password !== currentHash) {
      next(new AppError(StatusCodes.UNAUTHORIZED, "Wrong current password"));
      return;
    }

    user.password = hashPassword(newPassword);
    await user.save();

    // ✅ מייל התראה (לא שולחים סיסמה)
    try {
      await sendMail({
        to: user.email,
        subject: "Password changed ✅",
        html: `
          <p>היי ${user.name},</p>
          <p>הסיסמה שלך שונתה בהצלחה.</p>
          <p style="color:#888">אם זה לא אתה — פנה לתמיכה מיד.</p>
        `,
      });
    } catch (mailErr) {
      console.error("❌ SEND MAIL FAILED (CHANGE PASSWORD):", mailErr);
    }

    res.json({ message: "Password updated" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}