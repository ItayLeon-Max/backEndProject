import { Sequelize } from "sequelize-typescript";
import config from 'config'
import User from "../models/user";
import { InventoryLedger } from "../models/InventoryLedger";
import { Item } from "../models/Item";
import { Order } from "../models/Order";
import { OrderLine } from "../models/OrderLine";
import { Reservation } from "../models/Reservation";
import { StockBalance } from "../models/StockBalance";
import { Transfer } from "../models/Transfer";
import { TransferLine } from "../models/TransferLine";
import { Warehouse } from "../models/Warehouse";

const logging = config.get<boolean>('sequelize.logging') ? console.log : false

const sequelize = new Sequelize({
    // [ add ALL model classes you created to the array ]:
    models: [ InventoryLedger, Item, Order, OrderLine, Reservation, StockBalance, Transfer, TransferLine, Warehouse, User ],
    dialect: 'mysql',
    ...config.get('db'),
    logging,
})

export default sequelize