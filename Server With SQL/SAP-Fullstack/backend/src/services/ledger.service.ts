import { Op } from "sequelize";
import { StatusCodes } from "http-status-codes";
import AppError from "../errors/app-error";
import { InventoryLedger } from "../models/InventoryLedger";

export async function listLedger(params: {
  warehouseId?: string;
  itemId?: string;
  refType?: string;
  refId?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const where: any = {};

  if (params.warehouseId) where.warehouseId = params.warehouseId;
  if (params.itemId) where.itemId = params.itemId;
  if (params.refType) where.refType = params.refType;
  if (params.refId) where.refId = params.refId;

  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt[Op.gte] = new Date(params.from);
    if (params.to) where.createdAt[Op.lte] = new Date(params.to);
  }

  const limit = Math.min(Math.max(Number(params.limit ?? 100), 1), 500);

  return InventoryLedger.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
  });
}

export async function getLedgerByRef(refType: string, refId: string) {
  if (!refType || !refId) throw new AppError(StatusCodes.BAD_REQUEST, "refType & refId are required");
  return InventoryLedger.findAll({
    where: { refType, refId },
    order: [["createdAt", "ASC"]],
  });
}