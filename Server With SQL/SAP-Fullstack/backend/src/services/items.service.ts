import { Item } from "../models/Item";

export async function listItems() {
  return Item.findAll({ order: [["name", "ASC"]] });
}

export async function getItemById(id: string) {
  return Item.findByPk(id);
}