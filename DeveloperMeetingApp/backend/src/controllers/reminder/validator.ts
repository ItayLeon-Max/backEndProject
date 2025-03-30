import Joi from 'joi';

export const SendReminderValidator = Joi.object({
    reminderTo: Joi.string().min(6).required()
})