import { Table, Model, Column, DataType, ForeignKey, BelongsTo, PrimaryKey, Default } from 'sequelize-typescript';
import User from '../models/user';
import Email from '../models/email';

@Table({
  tableName: 'trash_emails',
  underscored: true,
})
export default class TrashEmail extends Model {
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

  @Default(DataType.NOW)
  @Column(DataType.DATE)
  deletedAt: Date;
}