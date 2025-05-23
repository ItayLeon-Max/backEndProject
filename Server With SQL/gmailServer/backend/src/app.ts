import dotenv from 'dotenv';
dotenv.config();
import express, { json } from "express"
import config from 'config'
import sequelize from "./db/sequelize"
import errorLogger from "./middlewares/error/error-logger"
import errorResponder from "./middlewares/error/error-responder"
import notFound from "./middlewares/not-found"
import cors from 'cors'
import authRouter from "./routers/auth/auth"
import emailRouter from "../src/routers/email/email"
import labelRouter from "../src/routers/label/label"
import emailLabelRouter from "../src/routers/email-label/email-labels"
import draftRouter from "../src/routers/draft/draft"
import spamRouter from "../src/routers/spam/spam"
import passport from "passport"
import '../src/utils/passport/google-strategy'
import googleRouter from "../src/routers/google-auth/google-auth"
import { syncAllUsersInboxOnStart } from '../src/service/gmailSync';
import sentEmailRouter from '../src/routers/sentEmail/sentEmail';

const port = config.get<string>('app.port')
const name = config.get<string>('app.name')
const force = config.get<boolean>('sequelize.sync.force')

const app = express();

export async function start() {
    await sequelize.sync({ force })

    await syncAllUsersInboxOnStart();

    // middlewares
    app.use(cors()) // allow any client to use this server

    app.use(json()) // a middleware to extract the post/put/patch data and save it to the request object in case the content type of the request is application/json

    
    app.use(passport.initialize());
     

    // routers
    app.use('/auth', authRouter,googleRouter)
    app.use('/emails', emailRouter)
    app.use('/labels', labelRouter, emailLabelRouter)
    app.use("/draft", draftRouter)
    app.use("/spam", spamRouter)
    app.use("/sent", sentEmailRouter)
    
    

    // special notFound middleware
    app.use(notFound)

    // error middleware
    app.use(errorLogger)
    app.use(errorResponder)

    // app.listen(port, () => console.log(`${name} started on port ${port}...`))
}

export default app