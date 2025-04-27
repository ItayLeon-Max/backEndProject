import {
    AllowNull,
    Column,
    DataType,
    Default,
    HasMany,
    Model,
    PrimaryKey,
    Table,
} from "sequelize-typescript";
import BankAccount from "../models/bankAccount";

@Table({
    tableName: "users",
    underscored: true,
})
export default class User extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    name: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    userName: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    password: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    email: string;

    @AllowNull(false)
    @Default("user")
    @Column(DataType.STRING)
    role: string; // 'admin' או 'user'
    
    @HasMany(() => BankAccount)
    accounts: BankAccount[];

}