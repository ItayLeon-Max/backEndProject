import {
    AllowNull,
    BelongsTo,
    Column,
    DataType,
    Default,
    ForeignKey,
    HasMany,
    Model,
    PrimaryKey,
    Table,
} from "sequelize-typescript";
import User from "../models/user";
import Transaction from "../models/transaction";

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
    @Column(DataType.STRING)
    accountNumber: string;

    @AllowNull(false)
    @Default(0)
    @Column(DataType.FLOAT)
    balance: number;

    @AllowNull(false)
    @Default("ILS")
    @Column(DataType.STRING)
    currency: string; 

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.UUID)
    userId: string;

    @BelongsTo(() => User)
    user: User;

    @HasMany(() => Transaction)
    transactions: Transaction[];
}