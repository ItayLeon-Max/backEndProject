import authenticate from "../../middlewares/auth";
import { deleteEmail, getEmails, getEmailSent, getEmailThread, getInbox, readEmailAt, replyToEmail, searchEmails, sendEmail } from "../../controllers/email/controller";
import { Router } from "express";


const emailRouter = Router();

emailRouter.get("/", getEmails); // get all emails
emailRouter.get("/inbox/:userId", getInbox); // get inbox emails
emailRouter.get("/sent/:userId", getEmailSent); // get sent emails
emailRouter.get("/thread/:emailId", getEmailThread); // get full thread of a mail
emailRouter.get("/search", authenticate ,searchEmails); // search emails
emailRouter.post("/:userId", sendEmail); // send email
emailRouter.post("/read/:emailId", readEmailAt) // mark email as read
emailRouter.post("/reply/:emailId", replyToEmail) // reply to email
emailRouter.delete("/:emailId/:userId", deleteEmail) // delete email

export default emailRouter;