import AppError from '../../errors/app-error';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import Label from '../../models/labels';
import User from '../../models/user';

export async function getLabels(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId } = req.params;

        // Assuming you have a User model and a Label model
        const user = await User.findByPk(userId);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));

        const labels = await Label.findAll({
            where: {
                userId: user.id,
            },
        });

        res.json(labels);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function createLabel(req: Request, res: Response, next: NextFunction) {
    try {
        const { name } = req.body;

        const existing = await Label.findOne({ where: { name } });
        if (existing) return next(new AppError(StatusCodes.CONFLICT, 'Label already exists'));

        const label = await Label.create({ name });

        res.status(StatusCodes.CREATED).json(label);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}