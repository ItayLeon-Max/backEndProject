import { Router } from 'express';
import passport from 'passport';
import { handleGoogleCallback } from '../../controllers/google-auth/controller';

const googleRouter = Router();

googleRouter.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

googleRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false,
  }),
  handleGoogleCallback
);

export default googleRouter;