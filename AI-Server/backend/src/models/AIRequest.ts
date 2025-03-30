import {
    AllowNull,
    Column,
    DataType,
    Default,
    Model,
    PrimaryKey,
    Table
  } from "sequelize-typescript";
  
  @Table({ underscored: true })
  export default class AIRequest extends Model {
  
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id!: string;
  
    @AllowNull(false)
    @Column(DataType.STRING)
    prompt!: string;
  
    @AllowNull(false)
    @Column(DataType.TEXT)
    response!: string;
  
    @AllowNull(false)
    @Default(DataType.NOW)
    @Column(DataType.DATE)
    createdAt!: Date;
  }