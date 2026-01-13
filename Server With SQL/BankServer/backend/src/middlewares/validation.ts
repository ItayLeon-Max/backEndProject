import { RequestHandler } from "express";
import { ObjectSchema } from "joi";
import { StatusCodes } from "http-status-codes";
import AppError from "../errors/app-error";

export default function validation(schema: ObjectSchema): RequestHandler {
  return (req, _res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      return next(
        new AppError(
          StatusCodes.BAD_REQUEST,
          error.details.map((d) => d.message).join(", ")
        )
      );
    }

    next();
  };
}