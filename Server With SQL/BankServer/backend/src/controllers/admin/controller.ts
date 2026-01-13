import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import User from "../../models/user";
import type { Role } from "../../types/role";
import { toRole } from "../../types/role";
import { Op } from "sequelize";

import sequelize from "../../db/sequelize";
import BankAccount from "../../models/bankAccount";
import Transaction from "../../models/transaction";

export async function getAllUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "userName", "email", "role", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    res.json(users);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function updateUserRole(req: Request<{ id: string }, {}, { role: Role }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const role = toRole(req.body.role);

    const user = await User.findByPk(id);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "User not found"));

    user.role = role;
    await user.save();

    res.json({ id: user.id, role: user.role });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function deleteUser(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, "User not found"));

    await sequelize.transaction(async (t) => {
      const accounts = await BankAccount.findAll({ where: { userId: id }, transaction: t });
      const accountIds = accounts.map((a) => a.id);

      if (accountIds.length) {
        await Transaction.destroy({
          where: {
            [Op.or]: [{ fromAccountId: accountIds }, { toAccountId: accountIds }],
          },
          transaction: t,
        });
      }

      await BankAccount.destroy({ where: { userId: id }, transaction: t });
      await user.destroy({ transaction: t });
    });

    res.json({ message: "User deleted" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function getAdmins(_req: Request, res: Response, next: NextFunction) {
  try {
    const admins = await User.findAll({
      where: { role: "admin" },
      attributes: ["id", "name", "userName", "email", "role", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });

    res.json(admins);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}

export async function getUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await User.findAll({
      where: { role: "user" },
      attributes: ["id", "name", "userName", "email", "role", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 500,
    });

    res.json(users);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, msg));
  }
}