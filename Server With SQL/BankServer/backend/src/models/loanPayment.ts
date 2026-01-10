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
  @Column(DataType.UUID)
  declare loanId: string;

  @BelongsTo(() => Loan)
  declare loan?: Loan;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare dueDate: Date;

  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare amountDue: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare principalPart: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare interestPart: string;

  @AllowNull(false)
  @Default(LoanPaymentStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(LoanPaymentStatus)))
  declare status: LoanPaymentStatus;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare paidAt?: Date | null;
}