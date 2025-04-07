import AppError from '../../errors/app-error';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import Email from '../../models/email';
import User from '../../models/user';

export async function getDrafts(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId } = req.params;
        const user = await User.findByPk(userId);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));

        const drafts = await Email.findAll({
            where: {
                userId: user.id,
                isDraft: true
            }
        });

        res.json(drafts);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}