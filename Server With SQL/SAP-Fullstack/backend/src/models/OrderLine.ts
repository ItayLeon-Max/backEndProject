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
  UpdatedAt,
} from "sequelize-typescript";
import { Order } from "./Order";
import { Item } from "./Item";

@Table({ tableName: "order_lines" })
export class OrderLine extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Order)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare orderId: string;

  @ForeignKey(() => Item)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare itemId: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(18, 3))
  declare qty: string;

  @BelongsTo(() => Order)
  declare order?: Order;

  @BelongsTo(() => Item)
  declare item?: Item;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}