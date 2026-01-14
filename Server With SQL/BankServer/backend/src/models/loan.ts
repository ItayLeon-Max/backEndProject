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

export type LoanStatus = "pending" | "approved" | "rejected" | "active" | "closed";

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

  @BelongsTo(() => BankAccount)
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
  @Default("pending")
  @Column(DataType.ENUM("pending", "approved", "rejected", "active", "closed"))
  declare status: LoanStatus;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(14, 2), field: "remaining_principal" })
  declare remainingPrincipal: string;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "start_date" })
  declare startDate: Date | null;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  declare note: string | null;
}