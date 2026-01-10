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

export enum LoanStatus {
  ACTIVE = "active",
  PAID = "paid",
}

@Table({
  tableName: "loans",
  underscored: true,
})
export default class Loan extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => BankAccount)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare accountId: string;

  @BelongsTo(() => BankAccount, "accountId")
  declare account?: BankAccount;

  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare principal: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(6, 2))
  declare annualRate: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare months: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare monthlyPayment: string;

  @AllowNull(false)
  @Default(LoanStatus.ACTIVE)
  @Column(DataType.ENUM(...Object.values(LoanStatus)))
  declare status: LoanStatus;
}