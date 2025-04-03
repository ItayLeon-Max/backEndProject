import { Sequelize } from "sequelize-typescript";
import config from 'config'
import User from "../models/user";
import Email from "../models/email";
import Label from "../models/labels";
import EmailLabel from "../models/emailLabel";
import Draft from "../models/draft";
import SpamEmail from "../models/spamEmail";


const logging = config.get<boolean>('sequelize.logging') ? console.log : false

const sequelize = new Sequelize({
    // [ add ALL model classes you created to the array ]:
    models: [  User, Email, Label, EmailLabel, Draft, SpamEmail  ],
    dialect: 'mysql',
    ...config.get('db'),
    logging,
})

export default sequelize