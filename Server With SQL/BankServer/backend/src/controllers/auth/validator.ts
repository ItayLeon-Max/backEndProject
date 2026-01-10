import Joi from "joi";

export const loginValidator = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

export const registerValidator = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  username: Joi.string().min(3).max(40).required(),
  password: Joi.string().min(4).max(200).required(),
  email: Joi.string().email().max(120).required(),

  // ✅ תואם לקוד שלך ול-DB: role קטן
  role: Joi.string().valid("user", "admin").default("user"),
});

export const updateUserValidator = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  username: Joi.string().min(3).max(40).required(),
  password: Joi.string().min(4).max(200).required(),
  email: Joi.string().email().max(120).required(),
  role: Joi.string().valid("user", "admin").required(),
});

export const deleteUserValidator = Joi.object({
  id: Joi.string().required(),
});