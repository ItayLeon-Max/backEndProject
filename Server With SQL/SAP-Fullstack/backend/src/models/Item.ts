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
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { StockBalance } from "../models/StockBalance";
import { InventoryLedger } from "../models/InventoryLedger";
import { TransferLine } from "../models/TransferLine";
import { OrderLine } from "../models/OrderLine";
import { Reservation } from "../models/Reservation";

@Table({ tableName: "items" })
export class Item extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(64))
  declare sku: string;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  declare name: string;

  @AllowNull(false)
  @Default("pcs")
  @Column(DataType.STRING(16))
  declare unit: string;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @HasMany(() => StockBalance)
  declare stockBalances?: StockBalance[];

  @HasMany(() => InventoryLedger)
  declare ledgerRows?: InventoryLedger[];

  @HasMany(() => TransferLine)
  declare transferLines?: TransferLine[];

  @HasMany(() => OrderLine)
  declare orderLines?: OrderLine[];

  @HasMany(() => Reservation)
  declare reservations?: Reservation[];

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}