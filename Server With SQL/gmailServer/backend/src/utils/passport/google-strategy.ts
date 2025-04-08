import passport from 'passport';
import { Profile, Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from 'config';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.get<string>('google.clientId'),
      clientSecret: config.get<string>('google.clientSecret'),
      callbackURL: config.get<string>('google.redirectUri'),
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj: Express.User, done) => {
  done(null, obj);
});