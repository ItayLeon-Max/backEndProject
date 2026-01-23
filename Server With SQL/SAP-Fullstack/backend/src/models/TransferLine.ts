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
import { Transfer } from "./Transfer";
import { Item } from "./Item";

@Table({ tableName: "transfer_lines" })
export class TransferLine extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Transfer)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare transferId: string;

  @ForeignKey(() => Item)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare itemId: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(18, 3))
  declare qty: string;

  @BelongsTo(() => Transfer)
  declare transfer?: Transfer;

  @BelongsTo(() => Item)
  declare item?: Item;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}