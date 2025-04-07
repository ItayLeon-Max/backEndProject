import { 
    AllowNull, 
    BelongsTo, 
    Column, 
    DataType, 
    Default, 
    ForeignKey, 
    HasMany, 
    Model, 
    PrimaryKey, 
    Table 
} from "sequelize-typescript";
import DevelopmentGroups from "./developmentGroup";
import Reminder from "./reminder";
import Tasks from "./task";

@Table({
    underscored: true,
})
export default class Meetings extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @ForeignKey(() => DevelopmentGroups)
    @AllowNull(false)
    @Column(DataType.UUID)
    developmentGroupId: string;

    @AllowNull(false)
    @Column(DataType.DATE)
    startTime: Date;

    @AllowNull(false)
    @Column(DataType.DATE)
    endTime: Date;

    @AllowNull(false)
    @Column(DataType.STRING)
    description: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    meetingRoom: string;

    @BelongsTo(() => DevelopmentGroups)
    developmentGroup: DevelopmentGroups;

    @HasMany(() => Reminder)
    reminder: Reminder[];

    @HasMany(() => Tasks)
    tasks: Tasks[];
}
