import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import {
  createWarehouse,
  listWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
} from "../../services/warehouses.service";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, name } = req.body ?? {};
    const row = await createWarehouse({ code, name });
    res.status(StatusCodes.CREATED).json(row);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await listWarehouses();
    res.status(StatusCodes.OK).json(rows);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id ?? "");
    const row = await getWarehouseById(id);
    res.status(StatusCodes.OK).json(row);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id ?? "");
    const { code, name } = req.body ?? {};
    const row = await updateWarehouse(id, { code, name });
    res.status(StatusCodes.OK).json(row);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id ?? "");
    const out = await deleteWarehouse(id);
    res.status(StatusCodes.OK).json(out);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}