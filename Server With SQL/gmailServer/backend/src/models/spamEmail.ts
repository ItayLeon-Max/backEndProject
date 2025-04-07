import { Table, Model, Column, DataType, ForeignKey, BelongsTo, Default, PrimaryKey } from "sequelize-typescript";
import User from "./user";
import Email from "./email";

@Table({
  tableName: "spam_emails",
  underscored: true,
  timestamps: true, 
})
export default class SpamEmail extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @ForeignKey(() => Email)
  @Column(DataType.UUID)
  emailId: string;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Email)
  email: Email;
}