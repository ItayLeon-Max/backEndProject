import AppError from '../../errors/app-error';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import User from '../../models/user';
import GoogleCredential from '../../models/googleCredential';
import { google } from 'googleapis';
import config from 'config';

export const getDrafts = (async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;
    
        const user = await User.findByPk(userId);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));
    
        const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
        if (!credentials) return next(new AppError(StatusCodes.UNAUTHORIZED, 'Missing Google credentials'));
    
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
    
        const draftList = await gmail.users.drafts.list({ userId: 'me', maxResults: 20 });
        const drafts = draftList.data.drafts;
    
        if (!drafts || drafts.length === 0) return res.json([]);
    
        const fullDrafts = await Promise.all(
          drafts.map(async (draft) => {
            const detail = await gmail.users.drafts.get({ userId: 'me', id: draft.id! });
            const payload = detail.data.message?.payload;
            const headers = payload?.headers || [];
    
            const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
            const bodyPart = payload?.parts?.find(part => part.mimeType === 'text/plain') || payload;
    
            const body = bodyPart?.body?.data
              ? Buffer.from(bodyPart.body.data, 'base64').toString('utf-8')
              : '';
    
            const createdAt = detail.data.message?.internalDate
              ? new Date(parseInt(detail.data.message.internalDate)).toISOString()
              : null;
    
            return {
              id: draft.id,
              subject,
              body,
              createdAt
            };
          })
        );
    
        res.json(fullDrafts);
      } catch (e: any) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
      }
  }) as RequestHandler;