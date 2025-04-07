import Joi from 'joi';

export const createTaskValidator = Joi.object({
    description: Joi.string().min(5).required(),
    meetingId: Joi.string().optional(),
    assignedTo: Joi.string().required(),
    status: Joi.string().optional(),
    deadline: Joi.date().required(),
});

export const updateTaskValidator= createTaskValidator;