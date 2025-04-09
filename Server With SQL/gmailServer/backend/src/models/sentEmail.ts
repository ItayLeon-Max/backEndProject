import {
    Table,
    Model,
    Column,
    DataType,
    ForeignKey,
    BelongsTo,
    Default,
    PrimaryKey,
  } from "sequelize-typescript";
  import User from "./user";
  
  @Table({
    tableName: "sent_emails",
    underscored: true,
    timestamps: true,
  })
  export default class SentEmail extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;
  
    @ForeignKey(() => User)
    @Column(DataType.UUID)
    userId: string;
  
    @Column(DataType.STRING)
    subject: string;
  
    @Column(DataType.TEXT)
    body: string;
  
    @Column(DataType.STRING)
    fromEmail: string;
  
    @Column(DataType.STRING)
    toEmail: string;
  
    @Column(DataType.DATE)
    sentAt: Date;
  
    @Column(DataType.STRING)
    gmailId: string;
  
    @Column(DataType.STRING)
    gmailMessageId: string;
  
    @Column(DataType.STRING)
    threadId: string;
  
    @BelongsTo(() => User)
    user: User;
  }