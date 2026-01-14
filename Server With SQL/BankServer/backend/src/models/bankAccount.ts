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
  @Column({ type: DataType.STRING(8), field: "account_number" })
  declare accountNumber: string;

  // ✅ DECIMAL חוזר לרוב כ-string
  @AllowNull(false)
  @Default("0.00")
  @Column({ type: DataType.DECIMAL(14, 2), field: "balance" })
  declare balance: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "user_id" })
  declare userId: string;

  @BelongsTo(() => User)
  declare user?: User;

  // ✅ מסגרת מאושרת (כמה מותר לרדת למינוס)
  @AllowNull(false)
  @Default("0.00")
  @Column({ type: DataType.DECIMAL(14, 2), field: "overdraft_limit" })
  declare overdraftLimit: string;

  // ✅ בקשה להגדלת מסגרת (בהמתנה)
  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(14, 2), field: "overdraft_requested_limit" })
  declare overdraftRequestedLimit: string | null;

  @AllowNull(false)
  @Default("none")
  @Column({
    type: DataType.ENUM("none", "pending", "approved", "rejected"),
    field: "overdraft_request_status",
  })
  declare overdraftRequestStatus: "none" | "pending" | "approved" | "rejected";

  @AllowNull(true)
  @Column({ type: DataType.STRING(255), field: "overdraft_request_note" })
  declare overdraftRequestNote: string | null;
}