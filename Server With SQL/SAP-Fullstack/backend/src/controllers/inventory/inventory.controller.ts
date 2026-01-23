import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import { receiveStock, issueStock, transferStock, getStockBalance } from "../../services/inventory.service";
import { addTransferLine, createTransferDoc, receiveTransferDoc, submitTransferDoc } from "../../services/transfers.service";

function actorIdFromReq(req: Request): string | null {
  // לפי המידלוור שלך בבנק: לרוב זה req.user / req.userId
  const anyReq = req as any;
  return (anyReq.user?.id ?? anyReq.userId ?? null) as string | null;
}

// POST /inventory/receive
export async function receive(req: Request, res: Response, next: NextFunction) {
  try {
    const { warehouseId, itemId, qty, note, refId } = req.body ?? {};
    const result = await receiveStock({
      warehouseId,
      itemId,
      qty: Number(qty),
      note,
      refId,
      actorUserId: actorIdFromReq(req),
    });
    res.status(StatusCodes.OK).json(result);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

// POST /inventory/issue
export async function issue(req: Request, res: Response, next: NextFunction) {
  try {
    const { warehouseId, itemId, qty, note, refId } = req.body ?? {};
    const result = await issueStock({
      warehouseId,
      itemId,
      qty: Number(qty),
      note,
      refId,
      actorUserId: actorIdFromReq(req),
    });
    res.status(StatusCodes.OK).json(result);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

// POST /inventory/transfer
export async function transfer(req: Request, res: Response, next: NextFunction) {
  try {
    const { fromWarehouseId, toWarehouseId, lines, note } = req.body ?? {};

    const actorUserId = actorIdFromReq(req);

    // 1) create
    const doc = await createTransferDoc({
      fromWarehouseId: String(fromWarehouseId ?? ""),
      toWarehouseId: String(toWarehouseId ?? ""),
      note: note ? String(note) : null,
      actorUserId,
    });

    // 2) add lines
    const norm = Array.isArray(lines)
      ? lines.map((l) => ({ itemId: String(l.itemId ?? ""), qty: Number(l.qty) }))
      : [];

    if (!norm.length) {
      throw new AppError(StatusCodes.BAD_REQUEST, "lines must be a non-empty array");
    }

    for (const l of norm) {
      await addTransferLine({ transferId: doc.id, itemId: l.itemId, qty: l.qty });
    }

    // 3) submit
    await submitTransferDoc({ transferId: doc.id, actorUserId });

    // 4) receive (moves stock + ledger)
    const received = await receiveTransferDoc({ transferId: doc.id, note: note ? String(note) : null, actorUserId });

    res.status(StatusCodes.OK).json({ transferId: doc.id, transfer: received });
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

// GET /inventory/stock?warehouseId=...&itemId=...
export async function stock(req: Request, res: Response, next: NextFunction) {
  try {
    const warehouseId = String(req.query.warehouseId ?? "");
    const itemId = String(req.query.itemId ?? "");
    const result = await getStockBalance(warehouseId, itemId);
    res.status(StatusCodes.OK).json(result);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}