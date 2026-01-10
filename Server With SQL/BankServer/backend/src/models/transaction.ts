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
import BankAccount from "./bankAccount";

export enum TransactionType {
  TRANSFER = "transfer",
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
}

@Table({
  tableName: "transactions",
  underscored: true,
})
export default class Transaction extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  // כסף: מומלץ לשמור DECIMAL, וב-TS לקבל כ-string (Sequelize מחזיר DECIMAL כטקסט)
  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare amount: string;

  @AllowNull(false)
  @Default(TransactionType.TRANSFER)
  @Column(DataType.ENUM(...Object.values(TransactionType)))
  declare type: TransactionType;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  declare description?: string;

  // מאיזה חשבון (ב-deposit יכול להיות null)
  @ForeignKey(() => BankAccount)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare fromAccountId?: string;

  @BelongsTo(() => BankAccount, "fromAccountId")
  declare fromAccount?: BankAccount;

  // לאיזה חשבון (ב-withdraw יכול להיות null)
  @ForeignKey(() => BankAccount)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare toAccountId?: string;

  @BelongsTo(() => BankAccount, "toAccountId")
  declare toAccount?: BankAccount;
}