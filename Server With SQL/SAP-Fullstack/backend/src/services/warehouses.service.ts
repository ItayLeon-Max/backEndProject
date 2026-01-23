import { StatusCodes } from "http-status-codes";
import AppError from "../errors/app-error";
import { Warehouse } from "../models/Warehouse";

export async function createWarehouse(input: { code: string; name: string }) {
  const code = String(input.code ?? "").trim();
  const name = String(input.name ?? "").trim();

  if (!code || !name) {
    throw new AppError(StatusCodes.BAD_REQUEST, "code & name are required");
  }

  const exists = await Warehouse.findOne({ where: { code } });
  if (exists) throw new AppError(StatusCodes.CONFLICT, "warehouse code already exists");

  const row = await Warehouse.create({ code, name });
  return row;
}

export async function listWarehouses() {
  return Warehouse.findAll({ order: [["createdAt", "DESC"]] });
}

export async function getWarehouseById(id: string) {
  const row = await Warehouse.findByPk(id);
  if (!row) throw new AppError(StatusCodes.NOT_FOUND, "warehouse not found");
  return row;
}

export async function updateWarehouse(id: string, input: { code?: string; name?: string }) {
  const row = await getWarehouseById(id);

  if (input.code !== undefined) row.code = String(input.code).trim();
  if (input.name !== undefined) row.name = String(input.name).trim();

  if (!row.code || !row.name) {
    throw new AppError(StatusCodes.BAD_REQUEST, "code & name are required");
  }

  // אם שינו code – לבדוק ייחודיות
  const dup = await Warehouse.findOne({ where: { code: row.code } });
  if (dup && dup.id !== row.id) {
    throw new AppError(StatusCodes.CONFLICT, "warehouse code already exists");
  }

  await row.save();
  return row;
}

export async function deleteWarehouse(id: string) {
  const row = await getWarehouseById(id);
  await row.destroy();
  return { ok: true };
}