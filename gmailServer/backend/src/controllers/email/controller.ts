import AppError from '../../errors/app-error';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import Email from '../../models/email';
import User from '../../models/user';
import Draft from '../../models/draft';
import { Op } from 'sequelize';

interface AuthRequest extends Request {
    user?: {email: string};
}

export async function getEmails(req: Request, res: Response, next: NextFunction) {
    try {
        const emails = await Email.findAll({
            include: [{
                association: 'labels',
                attributes: ['id', 'name'],
                through: {
                    attributes: []
             }}],
        });
        res.json(emails);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function sendEmail(req: Request, res: Response, next: NextFunction) {
    try {
        const { subject, body, fromEmail, toEmail, userId, replyToId, isDraft = false } = req.body;
        
        if(isDraft) {
            const draft = await Draft.create({
                subject,
                body,
                toEmail,
                fromEmail,
                userId,
                lastEditedAt: new Date()
            });
            res.status(StatusCodes.CREATED).json(draft);
            return;
        } 

        const emailData: any = {
            subject,
            body,
            fromEmail,
            toEmail,
            userId,
            replyToId,
            isDraft
        };

        if (!isDraft) {
            emailData.sentAt = new Date();
        }

        const email = await Email.create(emailData);

        res.json(email);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function getEmailInbox(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));

        const emails = await Email.findAll({
            where: {
                toEmail: user.email,
                deletedByReceiver: false,
                replyToId: null,
                isDraft: false
            },
            include: [{
                association: 'labels',
                attributes: ['id', 'name'],
                through: { attributes: [] }
            }]
        });

        res.json(emails);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function getEmailSent(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));

        const emails = await Email.findAll({
            where: {
                fromEmail: user.email,
                deletedBySender: false,
                replyToId: null
            },
        });

        res.json(emails);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function readEmailAt(req: Request, res: Response, next: NextFunction) {
    try {
        const { emailId } = req.params;

        const email = await Email.findByPk(emailId);
        if (!email) return next(new AppError(StatusCodes.NOT_FOUND, 'Email not found'));

        email.readAt = new Date();
        await email.save();

        res.json(email);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function deleteEmail(req: Request, res: Response, next: NextFunction) {
    try {
        const { emailId, userId } = req.params;

        const email = await Email.findByPk(emailId);
        if (!email) return next(new AppError(StatusCodes.NOT_FOUND, 'Email not found'));

        const user = await User.findByPk(userId);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));

        const isSender = email.fromEmail === user.email;
        const isReceiver = email.toEmail === user.email;

        if (!isSender && !isReceiver) return next(new AppError(StatusCodes.FORBIDDEN, 'You are not authorized to delete this email'));
        if (isSender) email.deletedBySender = true;
        if (isReceiver) email.deletedByReceiver = true;

        if (email.deletedBySender && email.deletedByReceiver) {
            await email.destroy();
        } else {
            await email.save();
        }

        res.status(StatusCodes.NO_CONTENT).send();
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function replyToEmail(req: Request, res: Response, next: NextFunction) {
    try {
        const { emailId } = req.params;
        const { subject, body, fromEmail, toEmail, userId } = req.body;
        const original = await Email.findByPk(emailId);
        if (!original) return next(new AppError(StatusCodes.NOT_FOUND, 'Email to reply to not found'));

        const reply = await Email.create({
            subject,
            body,
            fromEmail,
            toEmail,
            userId,
            sentAt: new Date(),
            replyToId: emailId
        });

        res.status(StatusCodes.CREATED).json(reply);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function getEmailThread(req: Request, res: Response, next: NextFunction) {
    try {
        const { emailId } = req.params;

        const email = await Email.findByPk(emailId);
        if (!email) return next(new AppError(StatusCodes.NOT_FOUND, 'Email not found'));

        const replies = await Email.findAll({
            where: { replyToId: emailId }
        });

        res.json({ email, replies });
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function searchEmails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { query } = req.query;
        const user = req.user;

        if (!user) return next(new AppError(StatusCodes.UNAUTHORIZED, "Missing user"));
        if (!query || typeof query !== "string") {
            return next(new AppError(StatusCodes.BAD_REQUEST, "Missing search query"));
        }

        const emails = await Email.findAll({
            where: {
                [Op.and]: [
                    {
                        subject: {
                            [Op.like]: `%${query}%`
                        }
                    },
                    {
                        [Op.or]: [
                            { toEmail: user.email },
                            { fromEmail: user.email }
                        ]
                    },
                    { isDraft: false }
                ]
            }
        });

        res.json(emails);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}