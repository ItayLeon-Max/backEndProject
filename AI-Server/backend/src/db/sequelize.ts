import { Sequelize } from "sequelize-typescript";
import config from 'config'
import DevelopmentGroups from "../models/AIRequest";
import AIRequest from "../models/AIRequest";

const logging = config.get<boolean>('sequelize.logging') ? console.log : false

const sequelize = new Sequelize({
    // [ add ALL model classes you created to the array ]:
    models: [ AIRequest  ],
    dialect: 'mysql',
    ...config.get('db'),
    logging,
})

export default sequelize