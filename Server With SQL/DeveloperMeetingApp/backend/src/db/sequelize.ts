import { Sequelize } from "sequelize-typescript";
import config from 'config'
import Reminder from "../models/reminder";
import User from "../models/user";
import DevelopmentGroups from "../models/developmentGroup";
import Meetings from "../models/Meeting";
import Tasks from "../models/task";

const logging = config.get<boolean>('sequelize.logging') ? console.log : false

const sequelize = new Sequelize({
    // [ add ALL model classes you created to the array ]:
    models: [ DevelopmentGroups, Meetings, Reminder, User, Tasks  ],
    dialect: 'mysql',
    ...config.get('db'),
    logging,
})

export default sequelize