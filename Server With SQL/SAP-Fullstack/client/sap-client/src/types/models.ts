export type ID = string;

export type Warehouse = {
  id: string;
  code: string;
  name: string;
};

export type Item = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  isActive: boolean;
};

export type StockBalance = {
  id?: string;
  warehouseId: string;
  itemId: string;
  onHand: string;
  reserved: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderStatus = "draft" | "released" | "picked" | "shipped" | "cancelled";

export type OrderLine = {
  id: ID;
  orderId: ID;
  itemId: ID;
  qty: string;
};

export type Reservation = {
  id: ID;
  orderId: ID;
  warehouseId: ID;
  itemId: ID;
  qtyReserved: string;
};

export type Order = {
  id: ID;
  orderNumber: string;
  status: OrderStatus;
  createdBy?: ID | null;
  createdAt?: string;
  updatedAt?: string;
  lines?: OrderLine[];
  reservations?: Reservation[];
};

export type TransferStatus = "draft" | "submitted" | "in_transit" | "received" | "cancelled";

export type TransferLine = {
  id: ID;
  transferId: ID;
  itemId: ID;
  qty: string;
};

export type Transfer = {
  id: ID;
  fromWarehouseId: ID;
  toWarehouseId: ID;
  status: TransferStatus;
  createdBy?: ID | null;
  receivedBy?: ID | null;
  submittedAt?: string | null;
  receivedAt?: string | null;
  lines?: TransferLine[];
};