import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  Index,
  CreatedAt,
} from "sequelize-typescript";
import { Order } from "./Order";
import { Warehouse } from "./Warehouse";
import { Item } from "./Item";

@Table({ tableName: "reservations" })
export class Reservation extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Order)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare orderId: string;

  @ForeignKey(() => Warehouse)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare warehouseId: string;

  @ForeignKey(() => Item)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare itemId: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(18, 3))
  declare qtyReserved: string;

  @BelongsTo(() => Order)
  declare order?: Order;

  @BelongsTo(() => Warehouse)
  declare warehouse?: Warehouse;

  @BelongsTo(() => Item)
  declare item?: Item;

  @CreatedAt
  declare createdAt: Date;
}