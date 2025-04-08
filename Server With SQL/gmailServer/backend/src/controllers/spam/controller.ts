import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import Email from '../../models/email';
import SpamEmail from '../../models/spamEmail';
import AppError from '../../errors/app-error';
import User from '../../models/user';
import { google } from 'googleapis';
import GoogleCredential from '../../models/googleCredential';

export const moveToSpam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, emailId, gmailMessageId } = req.body; 
  
      const user = await User.findByPk(userId);
      if (!user) {
        return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));
      }
  
      const email = await Email.findOne({
        where: {
          id: emailId,
          toEmail: user.email,
          deletedByReceiver: false,
          isDraft: false,
        }
      });
  
      if (!email) {
        return next(new AppError(StatusCodes.NOT_FOUND, 'Email not found in inbox'));
      }
  
      const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
      if (!credentials) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, 'Missing Google credentials'));
      }
  
      const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
  
      oAuth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });
  
      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
      if (!gmailMessageId) {
        return next(new AppError(StatusCodes.BAD_REQUEST, 'Missing gmailMessageId'));
      }
  
      await gmail.users.messages.modify({
        userId: 'me',
        id: gmailMessageId,
        requestBody: {
          addLabelIds: ['SPAM'],
          removeLabelIds: ['INBOX']
        }
      });
  
      email.isSpam = true;
      await email.save();
  
      await SpamEmail.create({ userId, emailId });
  
      res.status(StatusCodes.CREATED).json({ message: 'Email moved to spam (locally + Gmail)' });
    } catch (e) {
      next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
  };
export async function removeFromSpam(req: Request, res: Response, next: NextFunction){
    try {
        const { userId, emailId } = req.body; 
  
        const user = await User.findByPk(userId);
        if (!user) {
            return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));
        }
  
        const spamEmail = await SpamEmail.findOne({
            where: {
                emailId,
                userId
            }
        });
  
        if (!spamEmail) {
            return next(new AppError(StatusCodes.NOT_FOUND, 'Email not found in spam'));
        }
  
        await spamEmail.destroy();
  
        const email = await Email.findByPk(emailId);
        if (email) {
            email.isSpam = false;
            await email.save();
        }
  
        res.status(StatusCodes.OK).json({ message: 'Email removed from spam' });
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }

}
