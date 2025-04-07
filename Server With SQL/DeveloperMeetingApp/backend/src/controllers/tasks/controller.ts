import { NextFunction, Request, Response } from "express";
import Tasks from "../../models/task";
import AppError from "../../errors/app-error";
import { StatusCodes } from "http-status-codes";
import Meetings from "../../models/Meeting";
import User from "../../models/user";
import { verify } from "jsonwebtoken";
import config from "config";
import Reminder from "../../models/reminder";

export async function getAllTasks(req: Request, res: Response, next: NextFunction) {
    try {
        const tasks = await Tasks.findAll({ include: [User, Meetings] });
        res.json(tasks);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

export async function getTaskById(req: Request, res: Response, next: NextFunction) {
    try {
        const task = await Tasks.findByPk(req.params.id, { include: [User, Meetings] });
        if (!task) {
            res.status(404).json({ message: "Task not found" });
        } else {
            res.json(task);
        }
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

export async function getTasksByUser(req: Request, res: Response, next: NextFunction) {
    try {
        const tasks = await Tasks.findAll({ 
            where: { assignedTo: req.params.userId }
        });

        res.json(tasks);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

export async function addTask(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new AppError(StatusCodes.UNAUTHORIZED, 'Token not provided'));
        }

        const token = authHeader.split(' ')[1];
        const decoded = verify(token, config.get<string>('app.jwtSecret')) as { id: string, role: string };

        if (decoded.role.toLowerCase() !== 'admin') {
            return next(new AppError(StatusCodes.FORBIDDEN, 'Only admins can create tasks.'));
        }

        const { description, meetingId, assignedTo, status, deadline } = req.body;

        const user = await User.findByPk(assignedTo);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, `User with id ${assignedTo} not found`));

        if (meetingId) {
            const meeting = await Meetings.findByPk(meetingId);
            if (!meeting) return next(new AppError(StatusCodes.NOT_FOUND, `Meeting with id ${meetingId} not found`));
        }

        const task = await Tasks.create({
            description,
            meetingId: meetingId || null,
            assignedTo,
            sentFrom: decoded.id,
            status: status || 'open',
            deadline: new Date(deadline),
        });

        res.status(StatusCodes.CREATED).json(task);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next(new AppError(StatusCodes.UNAUTHORIZED, 'Token not provided'));

        const token = authHeader.split(' ')[1];
        const decoded = verify(token, config.get<string>('app.jwtSecret')) as { id: string, role: string };

        if (decoded.role.toLowerCase() !== 'admin') return next(new AppError(StatusCodes.FORBIDDEN, 'Only admins can update tasks.'));

        const task = await Tasks.findByPk(req.params.id);
        if (!task) return next(new AppError(StatusCodes.NOT_FOUND, `Task with id ${req.params.id} not found`));

        const { description, meetingId, assignedTo, status, deadline } = req.body;

        const user = await User.findByPk(assignedTo);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, `User with id ${assignedTo} not found`));

        if (meetingId) {
            const meeting = await Meetings.findByPk(meetingId);
            if (!meeting) return next(new AppError(StatusCodes.NOT_FOUND, `Meeting with id ${meetingId} not found`));
        }

        task.description = description;
        task.meetingId = meetingId || null;
        task.assignedTo = assignedTo;
        task.status = status || 'open';
        task.deadline = new Date(deadline);

        await task.save();
        res.json(task);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next(new AppError(StatusCodes.UNAUTHORIZED, 'Token not provided'));

        const token = authHeader.split(' ')[1];
        const decoded = verify(token, config.get<string>('app.jwtSecret')) as { id: string, role: string };

        if (decoded.role.toLowerCase() !== 'admin') return next(new AppError(StatusCodes.FORBIDDEN, 'Only admins can delete tasks.'));

        const task = await Tasks.findByPk(req.params.id);
        if (!task) return next(new AppError(StatusCodes.NOT_FOUND, `Task with id ${req.params.id} not found`));

        await task.destroy();
        res.json({ message: "Task deleted" });
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

export async function sendTask(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next(new AppError(StatusCodes.UNAUTHORIZED, 'Token not provided'));

        const token = authHeader.split(' ')[1];
        const decoded = verify(token, config.get<string>('app.jwtSecret')) as { id: string, role: string };

        if (decoded.role.toLowerCase() !== 'admin') return next(new AppError(StatusCodes.FORBIDDEN, 'Only admins can assign tasks.'));

        const { userId } = req.body;
        const { id } = req.params;

        if (!userId) return next(new AppError(StatusCodes.BAD_REQUEST, "userId is required"));

        const task = await Tasks.findByPk(id);
        if (!task) return next(new AppError(StatusCodes.NOT_FOUND, `Task with id ${id} not found`));

        const user = await User.findByPk(userId);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, `User with id ${userId} not found`));

        task.assignedTo = user.id;
        task.sentFrom = decoded.id;
        await task.save();

        await Reminder.create({
            meetingId: task.meetingId,
            reminderTo: user.email, 
        });

        res.status(StatusCodes.OK).json({
            message: `Task reminder sent to ${user.name} by ${decoded.id}`,
            task,
        });
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}