import sequelize from "../db/sequelize";
import { StockBalance } from "../models/StockBalance";
import { InventoryLedger, type LedgerRefType } from "../models/InventoryLedger";
import AppError from "../errors/app-error";
import { StatusCodes } from "http-status-codes";

function toQty3(n: number): string {
  // שומרים 3 ספרות אחרי נקודה כמו המודלים שלך
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

  // create with zero
  return await StockBalance.create(
    {
      warehouseId,
      itemId,
      onHand: "0.000",
      reserved: "0.000",
    },
    { transaction: t }
  );
}

async function addLedger(params: {
  warehouseId: string;
  itemId: string;
  qtyDelta: number; // signed
  refType: LedgerRefType;
  refId: string;
  note?: string | null;
  actorUserId?: string | null;
  t: any;
}) {
  const { warehouseId, itemId, qtyDelta, refType, refId, note, actorUserId, t } = params;

  await InventoryLedger.create(
    {
      warehouseId,
      itemId,
      qtyDelta: toQty3(qtyDelta),
      refType,
      refId,
      note: note ?? null,
      actorUserId: actorUserId ?? null,
    },
    { transaction: t }
  );
}

export type ReceiveInput = {
  warehouseId: string;
  itemId: string;
  qty: number;
  note?: string;
  actorUserId?: string | null;
  refId?: string; // אם אין, נייצר uuid בצד שלך? כאן נשאיר חובה מה-controller או נשתמש ב-random
};

export type IssueInput = {
  warehouseId: string;
  itemId: string;
  qty: number;
  note?: string;
  actorUserId?: string | null;
  refId?: string;
};

export type TransferInput = {
  transferId: string; // ref למסמך
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: Array<{ itemId: string; qty: number }>;
  note?: string;
  actorUserId?: string | null;
};

export async function receiveStock(input: ReceiveInput) {
  const { warehouseId, itemId, qty, note, actorUserId, refId } = input;

  if (!warehouseId || !itemId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "warehouseId & itemId are required");
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "qty must be a positive number");
  }
  if (!refId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "refId is required (receipt reference)");
  }

  return await sequelize.transaction(async (t) => {
    const bal = await getOrCreateBalance(warehouseId, itemId, t);

    const onHand = num(bal.onHand);
    const reserved = num(bal.reserved);

    bal.onHand = toQty3(onHand + qty);
    bal.reserved = toQty3(reserved); // unchanged
    await bal.save({ transaction: t });

    await addLedger({
      warehouseId,
      itemId,
      qtyDelta: +qty,
      refType: "receipt",
      refId,
      note: note ?? null,
      actorUserId: actorUserId ?? null,
      t,
    });

    return { stockBalance: bal };
  });
}

export async function issueStock(input: IssueInput) {
  const { warehouseId, itemId, qty, note, actorUserId, refId } = input;

  if (!warehouseId || !itemId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "warehouseId & itemId are required");
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "qty must be a positive number");
  }
  if (!refId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "refId is required (issue reference)");
  }

  return await sequelize.transaction(async (t) => {
    const bal = await getOrCreateBalance(warehouseId, itemId, t);

    const onHand = num(bal.onHand);
    const reserved = num(bal.reserved);

    const available = onHand - reserved;
    if (available < qty) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Insufficient stock. Available=${available.toFixed(3)}, requested=${qty.toFixed(3)}`
      );
    }

    bal.onHand = toQty3(onHand - qty);
    await bal.save({ transaction: t });

    await addLedger({
      warehouseId,
      itemId,
      qtyDelta: -qty,
      refType: "adjustment",
      refId,
      note: note ?? null,
      actorUserId: actorUserId ?? null,
      t,
    });

    return { stockBalance: bal };
  });
}

export async function transferStock(input: TransferInput) {
  const { transferId, fromWarehouseId, toWarehouseId, lines, note, actorUserId } = input;

  if (!transferId) throw new AppError(StatusCodes.BAD_REQUEST, "transferId is required");
  if (!fromWarehouseId || !toWarehouseId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "fromWarehouseId & toWarehouseId are required");
  }
  if (fromWarehouseId === toWarehouseId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "fromWarehouseId and toWarehouseId must be different");
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "lines must be a non-empty array");
  }

  // normalize / validate lines
  const norm = lines.map((l) => ({
    itemId: String(l.itemId ?? ""),
    qty: Number(l.qty),
  }));

  for (const l of norm) {
    if (!l.itemId) throw new AppError(StatusCodes.BAD_REQUEST, "line.itemId is required");
    if (!Number.isFinite(l.qty) || l.qty <= 0) throw new AppError(StatusCodes.BAD_REQUEST, "line.qty must be positive");
  }

  return await sequelize.transaction(async (t) => {
    // קודם בודקים זמינות לכל השורות (כדי לא להעביר חלקית)
    for (const l of norm) {
      const fromBal = await getOrCreateBalance(fromWarehouseId, l.itemId, t);
      const onHand = num(fromBal.onHand);
      const reserved = num(fromBal.reserved);
      const available = onHand - reserved;

      if (available < l.qty) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Insufficient stock for item ${l.itemId}. Available=${available.toFixed(3)}, requested=${l.qty.toFixed(3)}`
        );
      }
    }

    // עכשיו מבצעים: OUT מהמחסן מקור + IN למחסן יעד + ledger כפול לכל שורה
    for (const l of norm) {
      const fromBal = await getOrCreateBalance(fromWarehouseId, l.itemId, t);
      const toBal = await getOrCreateBalance(toWarehouseId, l.itemId, t);

      fromBal.onHand = toQty3(num(fromBal.onHand) - l.qty);
      await fromBal.save({ transaction: t });

      toBal.onHand = toQty3(num(toBal.onHand) + l.qty);
      await toBal.save({ transaction: t });

      await addLedger({
        warehouseId: fromWarehouseId,
        itemId: l.itemId,
        qtyDelta: -l.qty,
        refType: "transfer",
        refId: transferId,
        note: note ?? null,
        actorUserId: actorUserId ?? null,
        t,
      });

      await addLedger({
        warehouseId: toWarehouseId,
        itemId: l.itemId,
        qtyDelta: +l.qty,
        refType: "transfer",
        refId: transferId,
        note: note ?? null,
        actorUserId: actorUserId ?? null,
        t,
      });
    }

    return { ok: true };
  });
}

export async function getStockBalance(warehouseId: string, itemId: string) {
  if (!warehouseId || !itemId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "warehouseId & itemId are required");
  }

  const bal = await StockBalance.findOne({ where: { warehouseId, itemId } });
  if (!bal) return { warehouseId, itemId, onHand: "0.000", reserved: "0.000" };
  return bal;
}