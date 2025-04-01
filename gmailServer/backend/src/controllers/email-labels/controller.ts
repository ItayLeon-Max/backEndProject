import AppError from '../../errors/app-error';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import Email from '../../models/email';
import EmailLabel from '../../models/emailLabel';
import Label from '../../models/labels';

export async function addLabelToEmail(req: Request, res: Response, next: NextFunction) {
    try {
        const { emailId } = req.params;
        const { labelId } = req.body;

        const email = await Email.findByPk(emailId);
        if (!email) return next(new AppError(StatusCodes.NOT_FOUND, 'Email not found'));

        const label = await Label.findByPk(labelId);
        if (!label) return next(new AppError(StatusCodes.NOT_FOUND, 'Label not found'));

        const existing = await EmailLabel.findOne({ where: { emailId, labelId } });
        if (existing) return next(new AppError(StatusCodes.CONFLICT, 'Label already attached to email'));

        await EmailLabel.create({ emailId, labelId });

        res.status(StatusCodes.CREATED).json({ message: '✅ Label added to email' });
    } catch (e: any) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

