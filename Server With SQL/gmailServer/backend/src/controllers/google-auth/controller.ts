// קובץ: src/controllers/google-auth/controller.ts
import { Request, Response, NextFunction } from 'express';
import User from '../../models/user';
import GoogleCredential from '../../models/googleCredential';
import { google } from 'googleapis';
import { sign } from 'jsonwebtoken';
import config from 'config';

export async function handleGoogleCallback(req: Request, res: Response, next: NextFunction) {
  console.log("👉 req.user:", req.user);

  const profile = req.user as any;
  const googleId = profile.id;
  const name = profile.displayName;
  const email = profile.emails?.[0]?.value;
  const accessToken = profile.accessToken;
  const refreshToken = profile.refreshToken;

  if (!email || !name || !googleId || !accessToken || !refreshToken) {
    return res.status(400).json({ error: 'Missing Google user info' });
  }

  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({
      name,
      email,
      password: 'google_oauth_dummy',
      google_id: googleId
    });
    console.log("👉 req.user:", req.user);
  }

  await GoogleCredential.upsert({
    user_id: user.id,
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const jwt = sign({ id: user.id }, config.get<string>('app.jwtSecret'));
  res.json({ jwt });
}

export async function getInbox(req: Request, res: Response, next: NextFunction) {
  const userId = req.params.userId;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
  if (!credentials) return res.status(403).json({ error: 'No Google credentials found' });

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID as string,
    process.env.GOOGLE_CLIENT_SECRET as string,
    process.env.GOOGLE_REDIRECT_URI as string
  );

  oAuth2Client.setCredentials({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const messages = await gmail.users.messages.list({ userId: 'me', labelIds: ['INBOX'], maxResults: 10 });

  res.json(messages.data);
}
