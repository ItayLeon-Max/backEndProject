import { StatusCodes } from "http-status-codes";
import AppError from "../errors/app-error";
import sequelize from "../db/sequelize";
import { Order } from "../models/Order";
import { OrderLine } from "../models/OrderLine";
import { Reservation } from "../models/Reservation";
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

export async function createOrderDoc(params: { orderNumber: string; actorUserId?: string | null }) {
  const orderNumber = String(params.orderNumber ?? "").trim();
  if (!orderNumber) throw new AppError(StatusCodes.BAD_REQUEST, "orderNumber is required");

  const exists = await Order.findOne({ where: { orderNumber } });
  if (exists) throw new AppError(StatusCodes.CONFLICT, "orderNumber already exists");

  const row = await Order.create({
    orderNumber,
    status: "draft",
    createdBy: params.actorUserId ?? null,
  });

  return row;
}

export async function addOrderLine(params: { orderId: string; itemId: string; qty: number }) {
  const orderId = String(params.orderId ?? "");
  const itemId = String(params.itemId ?? "");
  const qty = Number(params.qty);

  if (!orderId || !itemId) throw new AppError(StatusCodes.BAD_REQUEST, "orderId & itemId are required");
  if (!Number.isFinite(qty) || qty <= 0) throw new AppError(StatusCodes.BAD_REQUEST, "qty must be positive");

  const order = await Order.findByPk(orderId);
  if (!order) throw new AppError(StatusCodes.NOT_FOUND, "order not found");
  if (order.status !== "draft") throw new AppError(StatusCodes.BAD_REQUEST, "can add lines only in draft");

  const line = await OrderLine.create({ orderId, itemId, qty: toQty3(qty) });
  return line;
}

export async function getOrderDoc(orderId: string) {
  const row = await Order.findByPk(orderId, {
    include: [{ model: OrderLine }, { model: Reservation }],
  });
  if (!row) throw new AppError(StatusCodes.NOT_FOUND, "order not found");
  return row;
}

export async function listOrderDocs() {
  return Order.findAll({
    order: [["createdAt", "DESC"]],
    include: [{ model: OrderLine }, { model: Reservation }],
  });
}

export async function reserveOrder(params: { orderId: string; warehouseId: string; actorUserId?: string | null }) {
  const orderId = String(params.orderId ?? "");
  const warehouseId = String(params.warehouseId ?? "");

  if (!orderId || !warehouseId) throw new AppError(StatusCodes.BAD_REQUEST, "orderId & warehouseId are required");

  return sequelize.transaction(async (t) => {
    const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) throw new AppError(StatusCodes.NOT_FOUND, "order not found");

    if (order.status !== "draft") {
      throw new AppError(StatusCodes.BAD_REQUEST, "reserve allowed only in draft");
    }

    const lines = await OrderLine.findAll({ where: { orderId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!lines.length) throw new AppError(StatusCodes.BAD_REQUEST, "order has no lines");

    const existingRes = await Reservation.findOne({ where: { orderId }, transaction: t });
    if (existingRes) throw new AppError(StatusCodes.CONFLICT, "order already reserved");

    // 1) בדיקת זמינות לכל השורות
    for (const l of lines) {
      const bal = await getOrCreateBalance(warehouseId, l.itemId, t);
      const available = num(bal.onHand) - num(bal.reserved);
      const need = num(l.qty);
      if (available < need) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Insufficient stock for item ${l.itemId}. Available=${available.toFixed(3)}, need=${need.toFixed(3)}`
        );
      }
    }

    // 2) שמירת reserved + יצירת reservations
    for (const l of lines) {
      const bal = await getOrCreateBalance(warehouseId, l.itemId, t);
      const need = num(l.qty);

      bal.reserved = toQty3(num(bal.reserved) + need);
      await bal.save({ transaction: t });

      await Reservation.create(
        {
          orderId,
          warehouseId,
          itemId: l.itemId,
          qtyReserved: toQty3(need),
        },
        { transaction: t }
      );
    }

    // לשדרוג סטטוס
    order.status = "released";
    await order.save({ transaction: t });

    return getOrderDoc(orderId);
  });
}

export async function unreserveOrder(params: { orderId: string }) {
  const orderId = String(params.orderId ?? "");
  if (!orderId) throw new AppError(StatusCodes.BAD_REQUEST, "orderId is required");

  return sequelize.transaction(async (t) => {
    const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) throw new AppError(StatusCodes.NOT_FOUND, "order not found");

    if (order.status !== "released") {
      throw new AppError(StatusCodes.BAD_REQUEST, "unreserve allowed only when status=released");
    }

    const reservations = await Reservation.findAll({ where: { orderId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!reservations.length) throw new AppError(StatusCodes.BAD_REQUEST, "no reservations for order");

    // להוריד reserved
    for (const r of reservations) {
      const bal = await getOrCreateBalance(r.warehouseId, r.itemId, t);
      const dec = num(r.qtyReserved);
      bal.reserved = toQty3(Math.max(0, num(bal.reserved) - dec));
      await bal.save({ transaction: t });
      await r.destroy({ transaction: t });
    }

    order.status = "draft";
    await order.save({ transaction: t });

    return getOrderDoc(orderId);
  });
}

export async function cancelOrder(params: { orderId: string }) {
  const orderId = String(params.orderId ?? "");
  if (!orderId) throw new AppError(StatusCodes.BAD_REQUEST, "orderId is required");

  return sequelize.transaction(async (t) => {
    const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) throw new AppError(StatusCodes.NOT_FOUND, "order not found");

    // אם יש reservations – קודם unreserve
    const reservations = await Reservation.findAll({ where: { orderId }, transaction: t, lock: t.LOCK.UPDATE });
    for (const r of reservations) {
      const bal = await getOrCreateBalance(r.warehouseId, r.itemId, t);
      const dec = num(r.qtyReserved);
      bal.reserved = toQty3(Math.max(0, num(bal.reserved) - dec));
      await bal.save({ transaction: t });
      await r.destroy({ transaction: t });
    }

    order.status = "cancelled";
    await order.save({ transaction: t });

    return getOrderDoc(orderId);
  });
}

export async function pickOrder(params: { orderId: string; actorUserId?: string | null }) {
  const orderId = String(params.orderId ?? "");
  if (!orderId) throw new AppError(StatusCodes.BAD_REQUEST, "orderId is required");

  return sequelize.transaction(async (t) => {
    const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) throw new AppError(StatusCodes.NOT_FOUND, "order not found");

    // pick רק אחרי reserve (released)
    if (order.status !== "released") {
      throw new AppError(StatusCodes.BAD_REQUEST, "pick allowed only when status=released");
    }

    const reservations = await Reservation.findAll({ where: { orderId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!reservations.length) throw new AppError(StatusCodes.BAD_REQUEST, "no reservations for order");

    order.status = "picked";
    await order.save({ transaction: t });

    return order; // או אם אתה רוצה: return getOrderDoc(orderId);
  });
}

export async function shipOrder(params: { orderId: string; note?: string | null; actorUserId?: string | null }) {
  const orderId = String(params.orderId ?? "");
  if (!orderId) throw new AppError(StatusCodes.BAD_REQUEST, "orderId is required");

  return sequelize.transaction(async (t) => {
    const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) throw new AppError(StatusCodes.NOT_FOUND, "order not found");

    // ✅ Idempotency: אם כבר נרשם Ledger להזמנה הזאת — לא מוציאים מלאי שוב
    const alreadyShippedLedger = await InventoryLedger.findOne({
      where: { refType: "order", refId: orderId },
      transaction: t,
      lock: t.LOCK.SHARE,
    });

    if (alreadyShippedLedger) {
      return getOrderDoc(orderId);
    }

    if (order.status !== "picked") {
      throw new AppError(StatusCodes.BAD_REQUEST, "ship allowed only when status=picked");
    }

    const reservations = await Reservation.findAll({ where: { orderId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!reservations.length) throw new AppError(StatusCodes.BAD_REQUEST, "no reservations for order");

    // 1) מורידים onHand וגם reserved בהתאם ל-reservations
    for (const r of reservations) {
      const bal = await getOrCreateBalance(r.warehouseId, r.itemId, t);

      const onHand = num(bal.onHand);
      const reserved = num(bal.reserved);
      const qty = num(r.qtyReserved);

      if (reserved < qty) {
        throw new AppError(StatusCodes.CONFLICT, "reserved inconsistency detected");
      }
      if (onHand < qty) {
        throw new AppError(StatusCodes.CONFLICT, "onHand inconsistency detected");
      }

      bal.onHand = toQty3(onHand - qty);
      bal.reserved = toQty3(reserved - qty);
      await bal.save({ transaction: t });

      // 2) Ledger (יציאה)
      await InventoryLedger.create(
        {
          warehouseId: r.warehouseId,
          itemId: r.itemId,
          qtyDelta: toQty3(-qty),
          refType: "order",
          refId: orderId,
          note: params.note ?? null,
          actorUserId: params.actorUserId ?? null,
        },
        { transaction: t }
      );

      await r.destroy({ transaction: t });
    }

    // 3) סטטוס shipped
    order.status = "shipped";
    await order.save({ transaction: t });

    return getOrderDoc(orderId);
  });
}