import { google } from 'googleapis';
import Email from '../../models/email';
import GoogleCredential from '../../models/googleCredential';
import User from '../../models/user';
import { Request, Response, NextFunction } from 'express';
import AppError from '../../errors/app-error';
import { StatusCodes } from 'http-status-codes';
import SentEmail from '../../models/sentEmail';

export const deleteSentEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { emailId } = req.params;

      console.log('📩 Deleting sent email with ID:', emailId);
  
      const sentEmail = await SentEmail.findByPk(emailId);
      if (!sentEmail) {
        return next(new AppError(StatusCodes.NOT_FOUND, 'Sent email not found'));
      }
  
      const user = await User.findOne({ where: { email: sentEmail.fromEmail } });
      if (!user) {
        return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));
      }
  
      const credentials = await GoogleCredential.findOne({ where: { user_id: user.id } });
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
  
      if (sentEmail.gmailMessageId) {
        await gmail.users.messages.delete({
          userId: 'me',
          id: sentEmail.gmailMessageId,
        });
      }
  
      await sentEmail.destroy();
  
      res.status(StatusCodes.OK).json({ message: 'Sent email deleted from Gmail and database' });
    } catch (e: any) {
      next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
  };

