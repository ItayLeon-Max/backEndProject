import { Router } from "express";
import { deleteReminder, getAllReminder, sendReminder } from "../controllers/reminder/controller";
import validation from "../middlewares/validation";
import { SendReminderValidator } from "../controllers/reminder/validator";

const reminderRouter = Router()

//reminder routes
reminderRouter.get('/', getAllReminder);
reminderRouter.post('/:id', validation(SendReminderValidator),sendReminder);
reminderRouter.delete('/:id', deleteReminder);

export default reminderRouter