import AppError from '../../errors/app-error';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import Email from '../../models/email';
import User from '../../models/user';
import Draft from '../../models/draft';
import { Op } from 'sequelize';
import { AuthRequest } from '../../types/AuthRequest';
import GoogleCredential from '../../models/googleCredential';
import { google } from 'googleapis';
import config from 'config';

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
      const { userId } = req.params;
      const { to, subject, message } = req.body;
  
      const user = await User.findByPk(userId);
      if (!user) return next(new AppError(404, 'User not found'));
  
      const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
      if (!credentials) return next(new AppError(403, 'Missing credentials'));
  
      const oAuth2Client = new google.auth.OAuth2(
        config.get<string>('google.clientId'),
        config.get<string>('google.clientSecret'),
        config.get<string>('google.redirectUri')
      );
  
      oAuth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });
  
      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
      const rawMessage = Buffer.from(
        `From: ${user.email}\r\n` +
        `To: ${to}\r\n` +
        `Subject: ${subject}\r\n\r\n` +
        `${message}`
      )
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
  
      const gmailResponse = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      });
  
      const savedEmail = await Email.create({
        fromEmail: user.email,
        toEmail: to,
        subject: subject,
        body: message,
        sentAt: new Date(),
        userId: user.id,
        isDraft: false,
      });
  
      res.status(200).json({
        message: 'Email sent and saved to database',
        gmailResponse,
        savedEmail,
      });
    } catch (e: any) {
      next(new AppError(500, e.message));
    }
  }

export async function getInbox(req: Request<{ userId: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
  
      const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
      if (!credentials) {
        res.status(403).json({ error: 'Google credentials not found for this user' });
        return;
      }
  
      const oAuth2Client = new google.auth.OAuth2(
        config.get<string>('google.clientId'),
        config.get<string>('google.clientSecret'),
        config.get<string>('google.redirectUri')
      );
  
      oAuth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });
  
      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
      const response = await gmail.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX'],
        maxResults: 10,
      });
  
      const messages = await Promise.all(
        (response.data.messages || []).map(async (msg) => {
          const fullMsg = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
          });
  
          const headers = fullMsg.data.payload?.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const from = headers.find(h => h.name === 'From')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || '';
  
          return {
            id: fullMsg.data.id,
            threadId: fullMsg.data.threadId,
            snippet: fullMsg.data.snippet,
            subject,
            from,
            date
          };
        })
      );
  
      res.json(messages);
    } catch (e) {
      next(e);
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