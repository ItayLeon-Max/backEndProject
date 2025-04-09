import { AllowNull, BelongsTo, BelongsToMany, Column, DataType, Default, ForeignKey, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript";
import User from "../models/user";
import Label from "../models/labels";
import EmailLabel from "./emailLabel";

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
    @Column(DataType.TEXT('long'))
    body: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    fromEmail: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    toEmail: string;

    @AllowNull(true)
    @Column(DataType.DATE)
    sentAt: Date | null;

    // Ensure @Column comes first 
    @AllowNull(true)
    @Column(DataType.DATE) 
    readAt: Date;  // Fix order here

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.UUID)
    userId: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    deletedBySender: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    deletedByReceiver: boolean; 

    @ForeignKey(() => Email)
    @AllowNull(true)
    @Column(DataType.UUID)
    replyToId: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    isDraft: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    isSpam: boolean;

    @AllowNull(true)
    @Column(DataType.STRING)
    gmailId: string;

    @Column(DataType.STRING)
    gmailMessageId: string;

    @Column(DataType.STRING)
    threadId: string;

    @BelongsTo(() => Email, { foreignKey: 'replyToId' })
    parentEmail: Email;

    @BelongsTo(() => User)
    user: User;

    @BelongsToMany(() => Label, () => EmailLabel)
    labels: Label[];

}