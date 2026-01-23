import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import { getItemById, listItems } from "../../services/items.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await listItems();
    res.status(StatusCodes.OK).json(rows);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id ?? "");
    const row = await getItemById(id);
    if (!row) return next(new AppError(StatusCodes.NOT_FOUND, "item not found"));
    res.status(StatusCodes.OK).json(row);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}