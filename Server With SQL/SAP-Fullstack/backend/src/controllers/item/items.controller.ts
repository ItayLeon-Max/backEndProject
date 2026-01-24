import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import {
  getItemById,
  listItems,
  createItem,
  updateItem,
  deleteItem,
} from "../../services/items.service";

function cleanStr(v: unknown): string {
  return String(v ?? "").trim();
}

function numOrNull(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

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
    const id = cleanStr(req.params.id);
    const row = await getItemById(id);
    if (!row) return next(new AppError(StatusCodes.NOT_FOUND, "item not found"));
    res.status(StatusCodes.OK).json(row);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body ?? {};

    const sku = cleanStr(body.sku);
    const name = cleanStr(body.name);
    const unit = cleanStr(body.unit);
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    const warehouseId = cleanStr(body.warehouseId) || null;
    const initialQty = numOrNull(body.initialQty); // יכול להיות null

    const row = await createItem({
      sku,
      name,
      unit,
      isActive,
      warehouseId,
      initialQty,
    });

    res.status(StatusCodes.CREATED).json(row);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = cleanStr(req.params.id);
    const body = req.body ?? {};

    const sku = body.sku !== undefined ? cleanStr(body.sku) : undefined;
    const name = body.name !== undefined ? cleanStr(body.name) : undefined;
    const unit = body.unit !== undefined ? cleanStr(body.unit) : undefined;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;

    const warehouseId = body.warehouseId !== undefined ? (cleanStr(body.warehouseId) || null) : undefined;
    const initialQty = body.initialQty !== undefined ? numOrNull(body.initialQty) : undefined;

    const row = await updateItem({
      id,
      sku,
      name,
      unit,
      isActive,
      warehouseId,
      initialQty,
    });

    res.status(StatusCodes.OK).json(row);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = cleanStr(req.params.id);
    const out = await deleteItem(id);
    res.status(StatusCodes.OK).json(out);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}