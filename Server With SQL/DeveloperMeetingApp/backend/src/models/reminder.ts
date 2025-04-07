import { AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import Meetings from "./Meeting";
import User from "./user";

@Table({
    underscored: true,
})
export default class Reminder extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @ForeignKey(() => Meetings)
    @AllowNull(false)
    @Column(DataType.UUID)
    meetingId: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    reminderTo: string;

    @BelongsTo(() => Meetings)
    meeting: Meetings;
}