import { createHmac } from "crypto";
import { sign } from "jsonwebtoken";
import config from "config";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import User from "../../models/user";
import AppError from "../../errors/app-error";
import socket from "../../io/io"; 

type JwtPayloadSafe = {
  id: string;
  name: string;
  userName: string;
  email: string;
  role: string;
};

export function hashPassword(password: string): string {
  return createHmac("sha256", config.get<string>("app.secret"))
    .update(password)
    .digest("hex");
}

function safeJwtPayload(user: User): JwtPayloadSafe {
  return {
    id: user.id,
    name: user.name,
    userName: user.userName,
    email: user.email,
    role: user.role,
  };
}

// get all users
export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] }, // ✅ לא מחזירים סיסמאות
    });
    res.json(users);
  } catch (e: any) {
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

// login
export async function login(
  req: Request<{}, {}, { username: string; password: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password) {
      return next(new AppError(StatusCodes.BAD_REQUEST, "Missing username/password"));
    }

    const user = await User.findOne({
      where: {
        userName: username.trim(),
        password: hashPassword(password),
      },
    });

    if (!user) return next(new AppError(StatusCodes.UNAUTHORIZED, "wrong credentials"));

    // JWT בלי password
    const payload = safeJwtPayload(user);

    const jwt = sign(payload, config.get<string>("app.jwtSecret"), {
      expiresIn: "2h",
    });

    const ev = {
      id: user.id,
      name: user.name,
      userName: user.userName,
      role: user.role,
      time: new Date().toISOString(),
    };

    socket.emit("user:online", ev);
    socket.emit("user:login", ev);

    res.json({
      jwt,
      message: `Welcome ${user.name}!`,
      user: payload,
    });
  } catch (e: any) {
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

//register
export async function register(
  req: Request<{}, {}, { name: string; username: string; password: string; email: string; role?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, username, password, email, role } = req.body;

    if (!name?.trim() || !username?.trim() || !password || !email?.trim()) {
      return next(new AppError(StatusCodes.BAD_REQUEST, "Missing fields"));
    }

    const exists = await User.findOne({
      where: { userName: username.trim() },
    });
    if (exists) return next(new AppError(StatusCodes.CONFLICT, "username already exists"));

    const emailExists = await User.findOne({
      where: { email: email.trim() },
    });
    if (emailExists) return next(new AppError(StatusCodes.CONFLICT, "email already exists"));

    const user = await User.create({
      name: name.trim(),
      userName: username.trim(),
      password: hashPassword(password),
      email: email.trim(),
      role: role?.trim() ? role.trim() : "user",
    });

    res.json(safeJwtPayload(user));
  } catch (e: any) {
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

//delete user
export async function deleteUser(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "user not found"));

    await user.destroy();
    res.json({ message: "user deleted" });
  } catch (e: any) {
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

//update user
export async function updateUser(
  req: Request<{ id: string }, {}, { name?: string; username?: string; password?: string; email?: string; role?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { name, username, password, email, role } = req.body;

    const user = await User.findByPk(id);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "user not found"));

    if (typeof name === "string" && name.trim()) user.name = name.trim();
    if (typeof username === "string" && username.trim()) user.userName = username.trim();
    if (typeof email === "string" && email.trim()) user.email = email.trim();
    if (typeof role === "string" && role.trim()) user.role = role.trim();

    if (typeof password === "string" && password) {
      user.password = hashPassword(password);
    }

    await user.save();

    res.json(safeJwtPayload(user));
  } catch (e: any) {
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

// logout
export async function logout(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id: userId } = req.params;
    if (!userId) return next(new AppError(StatusCodes.BAD_REQUEST, "Missing userId"));

    const user = await User.findByPk(userId);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "User not found"));

    const ev = {
      id: user.id,
      name: user.name,
      userName: user.userName,
      role: user.role,
      time: new Date().toISOString(),
    };

    socket.emit("user:logout", ev);

    res.json({ message: `User ${user.name} logged out` });
  } catch (e: any) {
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}