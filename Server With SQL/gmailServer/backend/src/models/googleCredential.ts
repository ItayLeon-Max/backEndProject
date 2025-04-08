import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  Default,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import User from './user';

@Table({
  tableName: 'google_credentials',
  underscored: true,
})
export default class GoogleCredential extends Model {

  @PrimaryKey
  @Default(uuidv4) // מייצר UUID אוטומטי כברירת מחדל
  @Column({
    type: DataType.UUID,
  })
  id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  accessToken: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  refreshToken: string;

  @BelongsTo(() => User)
  user: User;
}