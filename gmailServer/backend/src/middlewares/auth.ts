// src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "config";
import AppError from "../errors/app-error";
import { StatusCodes } from "http-status-codes";

export default function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, "Missing or invalid token"));
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, config.get<string>("app.jwtSecret"));
        // req.user = decoded; 
        (req as any).user = decoded;
        next();
    } catch (e) {
        next(new AppError(StatusCodes.UNAUTHORIZED, "Invalid token"));
    }
}