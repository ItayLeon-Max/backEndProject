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
import BankAccount from "../models/bankAccount";

@Table({
    tableName: "transactions",
    underscored: true,
})
export default class Transaction extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @ForeignKey(() => BankAccount)
    @AllowNull(false)
    @Column(DataType.UUID)
    accountId: string;

    @BelongsTo(() => BankAccount, "accountId")
    account: BankAccount;

    @AllowNull(false)
    @Column(DataType.ENUM("deposit", "withdraw", "transfer"))
    type: "deposit" | "withdraw" | "transfer";

    @AllowNull(false)
    @Column(DataType.FLOAT)
    amount: number;

    @Column(DataType.STRING)
    description: string;

    @ForeignKey(() => BankAccount)
    @Column(DataType.UUID)
    relatedAccountId?: string;  // if it's a transfer, this is the account to which the money was transferred

    @BelongsTo(() => BankAccount, "relatedAccountId")
    relatedAccount?: BankAccount;

    @Default(DataType.NOW)
    @Column(DataType.DATE)
    createdAt: Date;
}