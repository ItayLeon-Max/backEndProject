import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table, HasMany } from "sequelize-typescript";
import Email from "../models/email";

@Table({
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
    email: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    password: string;

    @HasMany(() => Email)
    emails: Email[];

}