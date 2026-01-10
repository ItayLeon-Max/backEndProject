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
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  ACTIVE = "active",
  CLOSED = "closed",
}

@Table({
  tableName: "loans",
  underscored: true,
})
export default class Loan extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => BankAccount)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare accountId: string;

  @BelongsTo(() => BankAccount)
  declare account?: BankAccount;

  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare principal: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(6, 3))
  declare annualInterestRate: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare termMonths: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare monthlyPayment: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare remainingPrincipal: string;

  @AllowNull(false)
  @Default(LoanStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(LoanStatus)))
  declare status: LoanStatus;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare startDate?: Date;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare note?: string;
}