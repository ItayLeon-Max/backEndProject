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
import Loan from "./loan";

export enum LoanPaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  LATE = "late",
}

@Table({
  tableName: "loan_payments",
  underscored: true,
})
export default class LoanPayment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Loan)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "loan_id" })
  declare loanId: string;

  @BelongsTo(() => Loan)
  declare loan?: Loan;

  @AllowNull(false)
  @Column({ type: DataType.DATE, field: "due_date" })
  declare dueDate: Date;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(14, 2), field: "amount_due" })
  declare amountDue: string;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(14, 2), field: "principal_part" })
  declare principalPart: string;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(14, 2), field: "interest_part" })
  declare interestPart: string;

  @AllowNull(false)
  @Default(LoanPaymentStatus.PENDING)
  @Column({ type: DataType.ENUM("pending", "paid", "late") })
  declare status: LoanPaymentStatus;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "paid_at" })
  declare paidAt?: Date | null;
}