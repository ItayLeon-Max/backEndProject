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
  HasMany,
  Index,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { Warehouse } from "./Warehouse";
import { TransferLine } from "../models/TransferLine";

export type TransferStatus = "draft" | "submitted" | "in_transit" | "received" | "cancelled";

@Table({ tableName: "transfers" })
export class Transfer extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Warehouse)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare fromWarehouseId: string;

  @ForeignKey(() => Warehouse)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare toWarehouseId: string;

  @AllowNull(false)
  @Default("draft")
  @Column(DataType.ENUM("draft", "submitted", "in_transit", "received", "cancelled"))
  declare status: TransferStatus;

  @AllowNull(true)
  @Index
  @Column(DataType.UUID)
  declare createdBy: string | null;

  @AllowNull(true)
  @Index
  @Column(DataType.UUID)
  declare receivedBy: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare submittedAt: Date | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare receivedAt: Date | null;

  @BelongsTo(() => Warehouse, "fromWarehouseId")
  declare fromWarehouse?: Warehouse;

  @BelongsTo(() => Warehouse, "toWarehouseId")
  declare toWarehouse?: Warehouse;

  @HasMany(() => TransferLine)
  declare lines?: TransferLine[];

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}