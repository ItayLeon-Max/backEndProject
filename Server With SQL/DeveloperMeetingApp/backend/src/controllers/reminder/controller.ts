import { NextFunction, Request, Response } from "express";
import Reminder from "../../models/reminder";
import Meetings from "../../models/Meeting";
import AppError from "../../errors/app-error";
import { StatusCodes } from "http-status-codes";
import { verify } from "jsonwebtoken";
import config from "config";

export async function getAllReminder(req: Request, res: Response, next: NextFunction) {
    try {
        const reminders = await Reminder.findAll();
        res.status(200).json(reminders);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

export async function sendReminder(req: Request<{id: string}, {}, { reminderTo: string }>, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { reminderTo } = req.body;
        // Extract the token from the request headers
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next(new AppError(StatusCodes.UNAUTHORIZED, 'Token not provided'));
        const token = authHeader.split(' ')[1];
        // Verify JWT and decode payload
        const decoded = verify(token, config.get<string>('app.jwtSecret')) as { id: string, userName: string, role: string };
        if (decoded.role.toLowerCase() !== 'admin') return next(new AppError(StatusCodes.FORBIDDEN, 'Only admins can send reminders.'));
        const meeting = await Meetings.findByPk(id);
        if (!meeting) return next(new AppError(StatusCodes.NOT_FOUND, `Meeting with id ${id} not found`));
        await Reminder.create({ meetingId: id, reminderTo });
        res.status(StatusCodes.OK).json({
            message: `Reminder sent for meeting with id ${id} to ${reminderTo}`,
            meeting,
        });
        console.log(`Reminder sent for meeting with id: ${id} to ${reminderTo}`);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

export async function deleteReminder(req: Request<{id: string}, {}, {}>, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const reminder = await Reminder.findByPk(id);
        if (!reminder) {
            res.status(404).json({ message: `reminder with id ${id} not found` });
            return;
        }
        await reminder.destroy();
        res.status(200).json({ message: `reminder with id ${id} deleted` });
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}