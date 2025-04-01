import {
    Table, Model, Column, DataType, PrimaryKey, Default, ForeignKey, BelongsTo,
    BelongsToMany
  } from "sequelize-typescript";
import User from "../models/user";
import Email from "../models/email";
import EmailLabel from "../models/emailLabel";
  
  @Table({
    underscored: true,
  })
  export default class Label extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;
  
    @ForeignKey(() => User)
    @Column(DataType.UUID)
    userId: string;
  
    @Column(DataType.STRING)
    name: string;
  
    @BelongsTo(() => User)
    user: User;

    @BelongsToMany(() => Email, () => EmailLabel)
    emails: Email[];        
  }