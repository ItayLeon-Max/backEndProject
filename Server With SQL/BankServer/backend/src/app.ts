import express, { json } from "express"
import config from 'config'
import sequelize from "./db/sequelize"
import errorLogger from "./middlewares/error/error-logger"
import errorResponder from "./middlewares/error/error-responder"
import notFound from "./middlewares/not-found"
import cors from 'cors'
import authRouter from "../src/routers/auth/auth"
import bankAccountRouter from "../src/routers/bankAccount/bankAccount"
import transactionsRouter from "../src/routers/transactions/transactions"
import loansRouter from "../src/routers/loans/loans"
import usersRouter from "../src/routers/users/users"
import adminRouter from "../src/routers/admin/admin"
import "./types/express-augment";

const port = config.get<string>('app.port')
const name = config.get<string>('app.name')
const force = config.get<boolean>('sequelize.sync.force')

const app = express();

export async function start() {
    await sequelize.sync({ force })

    // middlewares
    app.use(cors()) // allow any client to use this server

    app.use(json()) // a middleware to extract the post/put/patch data and save it to the request object in case the content type of the request is application/json

    // routers
    app.use('/auth', authRouter)
    app.use('/accounts', bankAccountRouter)
    app.use('/transactions', transactionsRouter)
    app.use('/loans', loansRouter)
    app.use("/users", usersRouter);
    app.use("/admin", adminRouter);
    

    // special notFound middleware
    app.use(notFound)

    // error middleware
    app.use(errorLogger)
    app.use(errorResponder)

    // app.listen(port, () => console.log(`${name} started on port ${port}...`))
}

export default app