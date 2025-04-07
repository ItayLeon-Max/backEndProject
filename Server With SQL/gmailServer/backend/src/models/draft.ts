import { AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import User from "./user";

@Table({ underscored: true })
export default class Draft extends Model {
  @PrimaryKey @Default(DataType.UUIDV4) @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User) @AllowNull(false) @Column(DataType.UUID)
  userId: string;

  @Column(DataType.STRING)
  subject: string;

  @Column(DataType.TEXT)
  body: string;
  
  @Column(DataType.STRING) toEmail: string;
  @Column(DataType.DATE) lastEditedAt: Date;

  @BelongsTo(() => User) user: User;
}