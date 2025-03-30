import { AllowNull, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import User from "./user";

@Table({
    underscored: true,
})
export default class Email extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    subject: string;

    @AllowNull(false)
    @Column(DataType.TEXT)
    body: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    fromEmail: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    toEmail: string;

    @AllowNull(false)
    @Column(DataType.DATE)
    sentAt: Date;

    // Ensure @Column comes first 
    @AllowNull(true)
    @Column(DataType.DATE) 
    readAt: Date;  // Fix order here

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.UUID)
    userId: string;
}