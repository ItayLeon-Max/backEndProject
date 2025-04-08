import { Router } from 'express';
import passport from 'passport';
import { handleGoogleCallback } from '../../controllers/google-auth/controller';
import GoogleCredential from '../../models/googleCredential';
import { sign } from 'jsonwebtoken';
import User from '../../models/user';
import config from 'config';

const googleRouter = Router();

googleRouter.get(
  '/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose'
    ],
    accessType: 'offline',
    prompt: 'consent'
  })
);

googleRouter.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { failureRedirect: '/login', session: false }, async (err, user, info) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Google authentication failed' });
      }

      try {
        const profile = user as any;

        const googleId = profile.googleId;
        const name = profile.name;
        const email = profile.email;
        const accessToken = profile.accessToken;
        const refreshToken = profile.refreshToken;

        if (!email || !name || !googleId || !accessToken || !refreshToken) {
          return res.status(400).json({ error: 'Missing Google user info' });
        }

        let dbUser = await User.findOne({ where: { email } });
        if (!dbUser) {
          dbUser = await User.create({
            name,
            email,
            password: 'google_oauth_dummy',
            google_id: googleId,
          });
        }

        await GoogleCredential.upsert({
          user_id: dbUser.id,
          accessToken: accessToken,
          refreshToken: refreshToken,
        });

        const jwt = sign({ id: dbUser.id }, config.get<string>('app.jwtSecret'));
        res.json({ jwt });
      } catch (e) {
        next(e);
      }
    })(req, res, next);
  }
);

export default googleRouter;