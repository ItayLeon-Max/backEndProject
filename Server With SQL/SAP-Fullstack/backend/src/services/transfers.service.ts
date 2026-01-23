import { StatusCodes } from "http-status-codes";
import AppError from "../errors/app-error";
import sequelize from "../db/sequelize";
import { Transfer } from "../models/Transfer";
import { TransferLine } from "../models/TransferLine";
import { StockBalance } from "../models/StockBalance";
import { InventoryLedger } from "../models/InventoryLedger";

function toQty3(n: number): string {
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getOrCreateBalance(warehouseId: string, itemId: string, t: any) {
  const found = await StockBalance.findOne({
    where: { warehouseId, itemId },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (found) return found;

  return StockBalance.create(
    { warehouseId, itemId, onHand: "0.000", reserved: "0.000" },
    { transaction: t }
  );
}

async function addLedger(params: {
  warehouseId: string;
  itemId: string;
  qtyDelta: number;
  refId: string; // transferId
  note?: string | null;
  actorUserId?: string | null;
  t: any;
}) {
  const { warehouseId, itemId, qtyDelta, refId, note, actorUserId, t } = params;
  await InventoryLedger.create(
    {
      warehouseId,
      itemId,
      qtyDelta: toQty3(qtyDelta),
      refType: "transfer",
      refId,
      note: note ?? null,
      actorUserId: actorUserId ?? null,
    },
    { transaction: t }
  );
}

// 1) CREATE (draft)
export async function createTransferDoc(input: {
  fromWarehouseId: string;
  toWarehouseId: string;
  note?: string | null;
  actorUserId?: string | null;
}) {
  const fromWarehouseId = String(input.fromWarehouseId ?? "");
  const toWarehouseId = String(input.toWarehouseId ?? "");
  if (!fromWarehouseId || !toWarehouseId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "fromWarehouseId & toWarehouseId are required");
  }
  if (fromWarehouseId === toWarehouseId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "fromWarehouseId and toWarehouseId must be different");
  }

  const doc = await Transfer.create({
    fromWarehouseId,
    toWarehouseId,
    status: "draft",
    createdBy: input.actorUserId ?? null,
  });

  return doc;
}

// 2) ADD LINE (draft only)
export async function addTransferLine(input: { transferId: string; itemId: string; qty: number }) {
  const transferId = String(input.transferId ?? "");
  const itemId = String(input.itemId ?? "");
  const qty = Number(input.qty);

  if (!transferId || !itemId) throw new AppError(StatusCodes.BAD_REQUEST, "transferId & itemId are required");
  if (!Number.isFinite(qty) || qty <= 0) throw new AppError(StatusCodes.BAD_REQUEST, "qty must be positive");

  const doc = await Transfer.findByPk(transferId);
  if (!doc) throw new AppError(StatusCodes.NOT_FOUND, "transfer not found");
  if (doc.status !== "draft") throw new AppError(StatusCodes.BAD_REQUEST, "can add lines only in draft");

  const line = await TransferLine.create({
    transferId,
    itemId,
    qty: toQty3(qty),
  });

  return line;
}

// 3) SUBMIT (draft → submitted)
export async function submitTransferDoc(input: { transferId: string; actorUserId?: string | null }) {
  const transferId = String(input.transferId ?? "");
  if (!transferId) throw new AppError(StatusCodes.BAD_REQUEST, "transferId is required");

  return sequelize.transaction(async (t) => {
    const doc = await Transfer.findByPk(transferId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!doc) throw new AppError(StatusCodes.NOT_FOUND, "transfer not found");
    if (doc.status !== "draft") throw new AppError(StatusCodes.BAD_REQUEST, "submit allowed only in draft");

    const lines = await TransferLine.findAll({ where: { transferId }, transaction: t });
    if (!lines.length) throw new AppError(StatusCodes.BAD_REQUEST, "transfer has no lines");

    doc.status = "submitted";
    doc.submittedAt = new Date();
    if (!doc.createdBy) doc.createdBy = input.actorUserId ?? null;
    await doc.save({ transaction: t });

    return doc;
  });
}

// 4) RECEIVE (submitted → received) + STOCK + LEDGER
export async function receiveTransferDoc(input: {
  transferId: string;
  note?: string | null;
  actorUserId?: string | null;
}) {
  const transferId = String(input.transferId ?? "");
  if (!transferId) throw new AppError(StatusCodes.BAD_REQUEST, "transferId is required");

  return sequelize.transaction(async (t) => {
    const doc = await Transfer.findByPk(transferId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!doc) throw new AppError(StatusCodes.NOT_FOUND, "transfer not found");

    if (doc.status === "cancelled") throw new AppError(StatusCodes.BAD_REQUEST, "transfer is cancelled");
    if (doc.status === "received") throw new AppError(StatusCodes.BAD_REQUEST, "transfer already received");
    if (doc.status !== "submitted" && doc.status !== "in_transit") {
      throw new AppError(StatusCodes.BAD_REQUEST, "receive allowed only in submitted/in_transit");
    }

    const lines = await TransferLine.findAll({
      where: { transferId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!lines.length) throw new AppError(StatusCodes.BAD_REQUEST, "transfer has no lines");

    // בדיקת זמינות במקור לכל השורות
    for (const l of lines) {
      const fromBal = await getOrCreateBalance(doc.fromWarehouseId, l.itemId, t);
      const available = num(fromBal.onHand) - num(fromBal.reserved);
      const need = num(l.qty);
      if (available < need) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Insufficient stock for item ${l.itemId}. Available=${available.toFixed(3)}, need=${need.toFixed(3)}`
        );
      }
    }

    // ביצוע תנועה + Ledger
    for (const l of lines) {
      const need = num(l.qty);

      const fromBal = await getOrCreateBalance(doc.fromWarehouseId, l.itemId, t);
      const toBal = await getOrCreateBalance(doc.toWarehouseId, l.itemId, t);

      fromBal.onHand = toQty3(num(fromBal.onHand) - need);
      await fromBal.save({ transaction: t });

      toBal.onHand = toQty3(num(toBal.onHand) + need);
      await toBal.save({ transaction: t });

      await addLedger({
        warehouseId: doc.fromWarehouseId,
        itemId: l.itemId,
        qtyDelta: -need,
        refId: transferId,
        note: input.note ?? null,
        actorUserId: input.actorUserId ?? null,
        t,
      });

      await addLedger({
        warehouseId: doc.toWarehouseId,
        itemId: l.itemId,
        qtyDelta: +need,
        refId: transferId,
        note: input.note ?? null,
        actorUserId: input.actorUserId ?? null,
        t,
      });
    }

    doc.status = "received";
    doc.receivedAt = new Date();
    doc.receivedBy = input.actorUserId ?? null;
    await doc.save({ transaction: t });

    return doc;
  });
}

// CANCEL
export async function cancelTransferDoc(input: { transferId: string; actorUserId?: string | null }) {
  const transferId = String(input.transferId ?? "");
  if (!transferId) throw new AppError(StatusCodes.BAD_REQUEST, "transferId is required");

  const doc = await Transfer.findByPk(transferId);
  if (!doc) throw new AppError(StatusCodes.NOT_FOUND, "transfer not found");
  if (doc.status === "received") throw new AppError(StatusCodes.BAD_REQUEST, "cannot cancel a received transfer");

  doc.status = "cancelled";
  await doc.save();
  return doc;
}

export async function getTransferDoc(transferId: string) {
  const doc = await Transfer.findByPk(transferId, { include: [TransferLine] });
  if (!doc) throw new AppError(StatusCodes.NOT_FOUND, "transfer not found");
  return doc;
}

export async function listTransferDocs() {
  return Transfer.findAll({ order: [["createdAt", "DESC"]], include: [TransferLine] });
}