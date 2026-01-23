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

@Table({ tableName: "warehouses" })
export class Warehouse extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(32))
  declare code: string; // למשל: TLV-01

  @AllowNull(false)
  @Column(DataType.STRING(120))
  declare name: string;

  @HasMany(() => StockBalance)
  declare stockBalances?: StockBalance[];

  @HasMany(() => InventoryLedger)
  declare ledgerRows?: InventoryLedger[];

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}