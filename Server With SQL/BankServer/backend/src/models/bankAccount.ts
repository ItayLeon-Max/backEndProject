import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";
import User from "./user";

@Table({
  tableName: "bank_accounts",
  underscored: true,
})
export default class BankAccount extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(8))
  declare accountNumber: string; 

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(14, 2))
  declare balance: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => User)
  declare user: User;
}