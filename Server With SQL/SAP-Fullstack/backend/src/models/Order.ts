import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  HasMany,
  Index,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { OrderLine } from "../models/OrderLine";
import { Reservation } from "../models/Reservation";

export type OrderStatus = "draft" | "released" | "picked" | "shipped" | "cancelled";

@Table({ tableName: "orders" })
export class Order extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(64))
  declare orderNumber: string;

  @AllowNull(false)
  @Default("draft")
  @Column(DataType.ENUM("draft", "released", "picked", "shipped", "cancelled"))
  declare status: OrderStatus;

  @AllowNull(true)
  @Index
  @Column(DataType.UUID)
  declare createdBy: string | null;

  @HasMany(() => OrderLine)
  declare lines?: OrderLine[];

  @HasMany(() => Reservation)
  declare reservations?: Reservation[];

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}