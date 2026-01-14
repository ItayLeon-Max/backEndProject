import {
  AllowNull,
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "transactions",
  underscored: true,
})
export default class Transaction extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING(30))
  declare type: string; // "deposit" | "withdraw" | "transfer" | "late_fee"

  @AllowNull(false)
  @Column(DataType.STRING(30))
  declare amount: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  declare description: string | null;

  @AllowNull(true)
  @Column(DataType.UUID)
  declare fromAccountId: string | null;

  @AllowNull(true)
  @Column(DataType.UUID)
  declare toAccountId: string | null;
}