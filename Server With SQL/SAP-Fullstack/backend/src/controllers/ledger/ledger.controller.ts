import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import { listLedger, getLedgerByRef } from "../../services/ledger.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { warehouseId, itemId, refType, refId, from, to, limit } = req.query as any;

    const rows = await listLedger({
      warehouseId: warehouseId ? String(warehouseId) : undefined,
      itemId: itemId ? String(itemId) : undefined,
      refType: refType ? String(refType) : undefined,
      refId: refId ? String(refId) : undefined,
      from: from ? String(from) : undefined,
      to: to ? String(to) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(StatusCodes.OK).json(rows);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function byRef(req: Request, res: Response, next: NextFunction) {
  try {
    const refType = String(req.params.refType ?? "");
    const refId = String(req.params.refId ?? "");
    const rows = await getLedgerByRef(refType, refId);
    res.status(StatusCodes.OK).json(rows);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}