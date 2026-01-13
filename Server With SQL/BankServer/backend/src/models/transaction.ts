import {
  AllowNull,
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "transactions",
  underscored: true,
})
export default class Transaction extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(14, 2))
  declare amount: string;

  @AllowNull(false)
  @Default("transfer")
  @Column(DataType.ENUM("transfer", "deposit", "withdraw"))
  declare type: "transfer" | "deposit" | "withdraw";

  @AllowNull(true)
  @Column(DataType.STRING(255))
  declare description: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.UUID,
    field: "from_account_id",
  })
  declare fromAccountId: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.UUID,
    field: "to_account_id",
  })
  declare toAccountId: string | null;

  @Column({ field: "created_at" })
  declare createdAt: Date;

  @Column({ field: "updated_at" })
  declare updatedAt: Date;
}