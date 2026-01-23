import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import {
  createOrderDoc,
  addOrderLine,
  reserveOrder,
  unreserveOrder,
  cancelOrder,
  getOrderDoc,
  listOrderDocs,
  pickOrder,
  shipOrder,
} from "../../services/orders.service";

function actorIdFromReq(req: Request): string | null {
  const anyReq = req as any;
  return (anyReq.user?.id ?? anyReq.userId ?? null) as string | null;
}

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderNumber } = req.body ?? {};
    const row = await createOrderDoc({
      orderNumber: String(orderNumber ?? ""),
      actorUserId: actorIdFromReq(req),
    });
    res.status(StatusCodes.CREATED).json(row);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function addLine(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = String(req.params.id ?? "");
    const { itemId, qty } = req.body ?? {};
    const row = await addOrderLine({ orderId, itemId: String(itemId ?? ""), qty: Number(qty) });
    res.status(StatusCodes.OK).json(row);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function reserve(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = String(req.params.id ?? "");
    const { warehouseId } = req.body ?? {};
    const out = await reserveOrder({
      orderId,
      warehouseId: String(warehouseId ?? ""),
      actorUserId: actorIdFromReq(req),
    });
    res.status(StatusCodes.OK).json(out);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function unreserve(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = String(req.params.id ?? "");
    const out = await unreserveOrder({ orderId });
    res.status(StatusCodes.OK).json(out);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = String(req.params.id ?? "");
    const out = await cancelOrder({ orderId });
    res.status(StatusCodes.OK).json(out);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = String(req.params.id ?? "");
    const out = await getOrderDoc(orderId);
    res.status(StatusCodes.OK).json(out);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const out = await listOrderDocs();
    res.status(StatusCodes.OK).json(out);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function pick(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = String(req.params.id ?? "");
    const out = await pickOrder({ orderId, actorUserId: actorIdFromReq(req) });
    res.status(StatusCodes.OK).json(out);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function ship(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = String(req.params.id ?? "");
    const { note } = req.body ?? {};
    const out = await shipOrder({
      orderId,
      note: note ? String(note) : null,
      actorUserId: actorIdFromReq(req),
    });
    res.status(StatusCodes.OK).json(out);
  } catch (e: any) {
    next(e instanceof AppError ? e : new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}