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
import { Warehouse } from "./Warehouse";
import { Item } from "./Item";

@Table({ tableName: "stock_balances" })
export class StockBalance extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Warehouse)
  @AllowNull(false)
  @Index("ux_stock_balance_wh_item")
  @Column(DataType.UUID)
  declare warehouseId: string;

  @ForeignKey(() => Item)
  @AllowNull(false)
  @Index("ux_stock_balance_wh_item")
  @Column(DataType.UUID)
  declare itemId: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(18, 3))
  declare onHand: string; 

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(18, 3))
  declare reserved: string;

  @BelongsTo(() => Warehouse)
  declare warehouse?: Warehouse;

  @BelongsTo(() => Item)
  declare item?: Item;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}