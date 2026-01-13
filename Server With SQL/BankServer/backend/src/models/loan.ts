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
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => BankAccount)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "account_id" })
  declare accountId: string;

  @BelongsTo(() => BankAccount, "accountId")
  declare account?: BankAccount;

  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare principal: string;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(6, 3), field: "annual_interest_rate" })
  declare annualInterestRate: string;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: "term_months" })
  declare termMonths: number;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(14, 2), field: "monthly_payment" })
  declare monthlyPayment: string;

  @AllowNull(false)
  @Default(LoanStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(LoanStatus)))
  declare status: LoanStatus;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(14, 2), field: "remaining_principal" })
  declare remainingPrincipal: string;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "start_date" })
  declare startDate?: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(255), field: "note" })
  declare note?: string | null;
}