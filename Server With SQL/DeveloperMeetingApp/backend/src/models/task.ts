import { 
    AllowNull, 
    BelongsTo, 
    Column, 
    DataType, 
    Default, 
    ForeignKey, 
    Model, 
    PrimaryKey, 
    Table 
} from "sequelize-typescript";
import User from "./user";
import Meetings from "./Meeting";

@Table({
    underscored: true,
})
export default class Tasks extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @ForeignKey(() => Meetings)
    @AllowNull(true) 
    @Column(DataType.UUID)
    meetingId: string;

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.UUID)
    sentFrom: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    description: string;

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.STRING)
    assignedTo: string; 

    @AllowNull(false)
    @Default('open')
    @Column(DataType.ENUM('open', 'in-progress', 'done'))
    status: string;

    @AllowNull(false)
    @Column(DataType.DATE)
    deadline: Date;

    @BelongsTo(() => User)
    assignedUser: User;

    @BelongsTo(() => Meetings)
    meeting: Meetings;
}