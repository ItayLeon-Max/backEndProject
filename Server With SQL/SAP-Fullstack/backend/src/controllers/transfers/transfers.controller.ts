import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import {
  createTransferDoc,
  addTransferLine,
  submitTransferDoc,
  receiveTransferDoc,
  cancelTransferDoc,
  getTransferDoc,
  listTransferDocs,
} from "../../services/transfers.service";

function actorIdFromReq(req: Request): string | null {
  const anyReq = req as any;
  return (anyReq.user?.id ?? anyReq.userId ?? null) as string | null;
}

export async function createTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const { fromWarehouseId, toWarehouseId, note } = req.body ?? {};
    const result = await createTransferDoc({
      fromWarehouseId: String(fromWarehouseId ?? ""),
      toWarehouseId: String(toWarehouseId ?? ""),
      note: note ? String(note) : null,
      actorUserId: actorIdFromReq(req),
    });
    res.status(StatusCodes.CREATED).json(result);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function addLine(req: Request, res: Response, next: NextFunction) {
  try {
    const transferId = String(req.params.id ?? "");
    const { itemId, qty } = req.body ?? {};

    const result = await addTransferLine({
      transferId,
      itemId: String(itemId ?? ""),
      qty: Number(qty),
    });

    res.status(StatusCodes.OK).json(result);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function submitTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const transferId = String(req.params.id ?? "");
    const result = await submitTransferDoc({
      transferId,
      actorUserId: actorIdFromReq(req),
    });
    res.status(StatusCodes.OK).json(result);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function receiveTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const transferId = String(req.params.id ?? "");
    const { note } = req.body ?? {};
    const result = await receiveTransferDoc({
      transferId,
      note: note ? String(note) : null,
      actorUserId: actorIdFromReq(req),
    });
    res.status(StatusCodes.OK).json(result);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function cancelTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const transferId = String(req.params.id ?? "");
    const result = await cancelTransferDoc({
      transferId,
      actorUserId: actorIdFromReq(req),
    });
    res.status(StatusCodes.OK).json(result);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function getTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const transferId = String(req.params.id ?? "");
    const result = await getTransferDoc(transferId);
    res.status(StatusCodes.OK).json(result);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function listTransfers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listTransferDocs();
    res.status(StatusCodes.OK).json(result);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}