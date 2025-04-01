import {
    Table, Model, Column, DataType, ForeignKey
  } from "sequelize-typescript";
  import Email from "../models/email";
  import Label from "../models/labels";
  
  @Table({
    tableName: "email_labels",
    underscored: true,
    timestamps: false,
  })
  export default class EmailLabel extends Model {
    @ForeignKey(() => Email)
    @Column(DataType.UUID)
    emailId: string;
  
    @ForeignKey(() => Label)
    @Column(DataType.UUID)
    labelId: string;
  }