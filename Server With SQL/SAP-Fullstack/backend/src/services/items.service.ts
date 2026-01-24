import { StatusCodes } from "http-status-codes";
import AppError from "../errors/app-error";
import { Item } from "../models/Item";
// ✅ שנה נתיב אם צריך:
import { StockBalance } from "../models/StockBalance";

function cleanStr(v: unknown): string {
  return String(v ?? "").trim();
}

function toQtyString(n: number): string {
  // אצלך המלאי נשמר כמחרוזת ("0.000") אז נשמור בפורמט אחיד
  return n.toFixed(3);
}

export async function listItems() {
  return Item.findAll({ order: [["createdAt", "DESC"]] });
}

export async function getItemById(id: string) {
  const itemId = cleanStr(id);
  if (!itemId) throw new AppError(StatusCodes.BAD_REQUEST, "id is required");
  return Item.findByPk(itemId);
}

export async function createItem(params: {
  sku: string;
  name: string;
  unit: string;
  isActive?: boolean;
  warehouseId?: string | null;
  initialQty?: number | null;
}) {
  const sku = cleanStr(params.sku);
  const name = cleanStr(params.name);
  const unit = cleanStr(params.unit);
  const isActive = params.isActive ?? true;

  if (!sku || !name || !unit) {
    throw new AppError(StatusCodes.BAD_REQUEST, "sku, name, unit are required");
  }

  const exists = await Item.findOne({ where: { sku } });
  if (exists) throw new AppError(StatusCodes.CONFLICT, "sku already exists");

  const item = await Item.create({ sku, name, unit, isActive });

  // ✅ אם בחר מחסן — ניצור/נעדכן StockBalance
  const warehouseId = params.warehouseId ? cleanStr(params.warehouseId) : "";
  if (warehouseId) {
    const initialQty = typeof params.initialQty === "number" ? params.initialQty : null;

    const [bal] = await StockBalance.findOrCreate({
      where: { warehouseId, itemId: item.id },
      defaults: {
        warehouseId,
        itemId: item.id,
        onHand: toQtyString(initialQty ?? 0),
        reserved: "0.000",
      },
    });

    // אם כבר היה קיים – נעדכן (רק אם נתנו initialQty)
    if (initialQty !== null) {
      bal.onHand = toQtyString(initialQty);
      if (!bal.reserved) bal.reserved = "0.000";
      await bal.save();
    }
  }

  return item;
}

export async function updateItem(params: {
  id: string;
  sku?: string;
  name?: string;
  unit?: string;
  isActive?: boolean;
  warehouseId?: string | null;
  initialQty?: number | null;
}) {
  const id = cleanStr(params.id);
  if (!id) throw new AppError(StatusCodes.BAD_REQUEST, "id is required");

  const row = await Item.findByPk(id);
  if (!row) throw new AppError(StatusCodes.NOT_FOUND, "item not found");

  const nextSku = params.sku !== undefined ? cleanStr(params.sku) : row.sku;
  const nextName = params.name !== undefined ? cleanStr(params.name) : row.name;
  const nextUnit = params.unit !== undefined ? cleanStr(params.unit) : row.unit;
  const nextIsActive = params.isActive !== undefined ? params.isActive : row.isActive;

  if (!nextSku || !nextName || !nextUnit) {
    throw new AppError(StatusCodes.BAD_REQUEST, "sku/name/unit cannot be empty");
  }

  if (nextSku !== row.sku) {
    const exists = await Item.findOne({ where: { sku: nextSku } });
    if (exists) throw new AppError(StatusCodes.CONFLICT, "sku already exists");
  }

  row.sku = nextSku;
  row.name = nextName;
  row.unit = nextUnit;
  row.isActive = nextIsActive;
  await row.save();

  // ✅ אם בחרו מחסן בעריכה — ניצור/נעדכן StockBalance
  if (params.warehouseId !== undefined) {
    const warehouseId = params.warehouseId ? cleanStr(params.warehouseId) : "";

    if (warehouseId) {
      const initialQty = params.initialQty === undefined ? null : params.initialQty;

      const [bal] = await StockBalance.findOrCreate({
        where: { warehouseId, itemId: row.id },
        defaults: {
          warehouseId,
          itemId: row.id,
          onHand: toQtyString((typeof initialQty === "number" ? initialQty : 0)),
          reserved: "0.000",
        },
      });

      // אם נתנו initialQty בפועל — נעדכן את onHand
      if (typeof initialQty === "number") {
        bal.onHand = toQtyString(initialQty);
        if (!bal.reserved) bal.reserved = "0.000";
        await bal.save();
      }
    }
  }

  return row;
}

export async function deleteItem(id: string) {
  const itemId = cleanStr(id);
  if (!itemId) throw new AppError(StatusCodes.BAD_REQUEST, "id is required");

  const row = await Item.findByPk(itemId);
  if (!row) throw new AppError(StatusCodes.NOT_FOUND, "item not found");

  await row.destroy();
  return { ok: true };
}