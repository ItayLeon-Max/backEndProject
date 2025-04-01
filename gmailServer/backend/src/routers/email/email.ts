import { deleteEmail, getEmailInbox, getEmails, getEmailSent, getEmailThread, readEmailAt, replyToEmail, sendEmail } from "../../controllers/email/controller";
import { Router } from "express";


const emailRouter = Router();

emailRouter.get("/", getEmails); // get all emails
emailRouter.get("/inbox/:userId", getEmailInbox); // get inbox emails
emailRouter.get("/sent/:userId", getEmailSent); // get sent emails
emailRouter.get("/thread/:emailId", getEmailThread); // get full thread of a mail
emailRouter.post("/", sendEmail); // send email
emailRouter.post("/read/:emailId", readEmailAt) // mark email as read
emailRouter.post("/reply/:emailId", replyToEmail) // reply to email
emailRouter.delete("/:emailId/:userId", deleteEmail) // delete email

export default emailRouter;