import Joi from 'joi';

export const loginValidator = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required()
})

export const registerValidator = Joi.object({
    name: Joi.string().min(5).required(),
    password: Joi.string().required(),
    email: Joi.string().email().required(),
})

export const updateUserValidator = registerValidator;

export const deleteUserValidator = Joi.object({
    id: Joi.string().required()
})

