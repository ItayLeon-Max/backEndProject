import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import config from 'config';
import { GoogleUser } from '../../types/GoogleUser';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.get<string>('google.clientId'),
      clientSecret: config.get<string>('google.clientSecret'),
      callbackURL: config.get<string>('google.redirectUri'),
    },
    async (accessToken, refreshToken, profile, done) => {
      const user = {
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value || '',
        accessToken,
        refreshToken,
      };

      console.log("✅ Google Strategy finished, user:", user);
      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj: Express.User, done) => {
  done(null, obj);
});