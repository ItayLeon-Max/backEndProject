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
  id: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.FLOAT)
  balance: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => User)
  user: User;
}