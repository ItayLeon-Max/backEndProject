import {
  Table, Model, Column, DataType, PrimaryKey, Default, BelongsToMany
} from "sequelize-typescript";
import Email from "./email";
import EmailLabel from "./emailLabel";

@Table({
  underscored: true,
})
export default class Label extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column(DataType.STRING)
  name: string;

  @BelongsToMany(() => Email, () => EmailLabel)
  emails: Email[];
}