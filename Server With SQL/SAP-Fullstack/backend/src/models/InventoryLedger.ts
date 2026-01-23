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
import { Warehouse } from "./Warehouse";
import { Item } from "./Item";

export type LedgerRefType = "transfer" | "order" | "adjustment" | "receipt";

@Table({ tableName: "inventory_ledger" })
export class InventoryLedger extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

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

  // signed: + נכנס, - יצא
  @AllowNull(false)
  @Column(DataType.DECIMAL(18, 3))
  declare qtyDelta: string;

  @AllowNull(false)
  @Column(DataType.ENUM("transfer", "order", "adjustment", "receipt"))
  declare refType: LedgerRefType;

  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare refId: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  declare note: string | null;

  // מי ביצע (אופציונלי)
  @AllowNull(true)
  @Index
  @Column(DataType.UUID)
  declare actorUserId: string | null;

  @BelongsTo(() => Warehouse)
  declare warehouse?: Warehouse;

  @BelongsTo(() => Item)
  declare item?: Item;

  @CreatedAt
  declare createdAt: Date;
}