import {
  AllowNull,
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";

@Table({
  tableName: "users",
  underscored: true,
})
export default class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING(80))
  declare name: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(40))
  declare userName: string;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  declare password: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(120))
  declare email: string;

  @AllowNull(false)
  @Default("user")
  @Column(DataType.STRING(20))
  declare role: string;
}