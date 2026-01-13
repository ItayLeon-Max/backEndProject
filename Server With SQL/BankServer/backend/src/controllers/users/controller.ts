import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import User from "../../models/user";
import { hashPassword } from "../auth/controller";
import { sign } from "jsonwebtoken";
import config from "config";
import { requireUser } from "../../utils/requireUser";

// GET /users/me
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const me = requireUser(req);

    const user = await User.findByPk(me.id, {
      attributes: ["id", "name", "userName", "email", "role", "createdAt", "updatedAt"],
    });

    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "User not found"));
    res.json(user);
  } catch (e: any) {
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

// PATCH /users/me
export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const me = requireUser(req);

    const { name, username, email } = req.body as { name?: string; username?: string; email?: string };

    const user = await User.findByPk(me.id);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "User not found"));

    if (username && username !== user.userName) {
      const exists = await User.findOne({ where: { userName: username } });
      if (exists) return next(new AppError(StatusCodes.CONFLICT, "Username already taken"));
      user.userName = username;
    }

    if (email && email !== user.email) {
      const exists = await User.findOne({ where: { email } });
      if (exists) return next(new AppError(StatusCodes.CONFLICT, "Email already taken"));
      user.email = email;
    }

    if (name) user.name = name;

    await user.save();

    // ✅ להחזיר JWT חדש (אם אצלך ה-JWT מכיל userName/email/role וכו')
    const jwt = sign(user.get({ plain: true }), config.get<string>("app.jwtSecret"));

    res.json({
      message: "Profile updated",
      jwt,
      user: {
        id: user.id,
        name: user.name,
        username: user.userName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e: any) {
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

// POST /users/me/password
export async function changeMyPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const me = requireUser(req);

    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (!currentPassword || !newPassword) {
      return next(new AppError(StatusCodes.BAD_REQUEST, "currentPassword and newPassword are required"));
    }

    const user = await User.findByPk(me.id);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "User not found"));

    const currentHash = hashPassword(currentPassword);
    if (user.password !== currentHash) {
      return next(new AppError(StatusCodes.UNAUTHORIZED, "Wrong current password"));
    }

    user.password = hashPassword(newPassword);
    await user.save();

    res.json({ message: "Password updated" });
  } catch (e: any) {
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}