import AppError from '../../errors/app-error';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import Email from '../../models/email';
import User from '../../models/user';
import TrashEmail from '../../models/trash';

export async function getTrash(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));

        const trashEmails = await Email.findAll({
            where: {
                toEmail: user.email,
                deletedByReceiver: true,
                isDraft: false
            }
        });

        res.status(StatusCodes.OK).json({ trashEmails });
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function moveEmailToTrash(req: Request, res: Response, next: NextFunction) {
    try {
        const { emailId, userId } = req.params;

        const user = await User.findByPk(userId);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));

        const email = await Email.findOne({
            where: {
                id: emailId,
                toEmail: user.email, 
                deletedByReceiver: false,
                isDraft: false
            }
        });

        if (!email) return next(new AppError(StatusCodes.NOT_FOUND, 'Email not found in inbox for this user'));

        await email.update({
            deletedByReceiver: true
        });

        await TrashEmail.create({
            emailId: email.id,
            userId: user.id
        })

        res.status(StatusCodes.OK).json({ message: 'Email moved to trash' });
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function deleteEmailForEver(req: Request, res: Response, next: NextFunction) {
    try {
        const { emailId } = req.params;

        const email = await TrashEmail.findByPk(emailId);
        if (!email) return next(new AppError(StatusCodes.NOT_FOUND, 'Email not found in trash'));

        await email.destroy();

        res.status(StatusCodes.OK).json({ message: 'Email deleted for ever' });
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}
