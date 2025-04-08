import { Request, Response } from 'express';
import User from '../../models/user';
import { sign } from 'jsonwebtoken';
import config from 'config';

export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const googleUser = req.user as any;

  if (!googleUser) {
    res.status(401).json({ error: 'Google user not found' });
    return;
  }

  const email = googleUser.emails?.[0]?.value;
  const name = googleUser.displayName;
  const googleId = googleUser.id;

  if (!email || !name || !googleId) {
    res.status(400).json({ error: 'Missing Google user info' });
    return;
  }

  let user = await User.findOne({ where: { email } });

  if (!user) {
    user = await User.create({
      name,
      email,
      password: 'google_oauth_dummy',
      google_id: googleId
    });
  } else if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
    

  }

  const jwt = sign(user.get({ plain: true }), config.get<string>('app.jwtSecret'));

  res.json({ jwt });
}