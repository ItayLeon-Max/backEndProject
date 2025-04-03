import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import Email from '../../models/email';
import SpamEmail from '../../models/spamEmail';
import AppError from '../../errors/app-error';
import User from '../../models/user';

export async function moveToSpam(req: Request, res: Response, next: NextFunction) {
  try {
      const { userId, emailId } = req.body; 
      
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

      await SpamEmail.create({
          userId: userId,     
          emailId: emailId,   
      });

      res.status(StatusCodes.CREATED).json({ message: 'Email moved to spam' });
  } catch (e) {
      next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
  }
}

export async function removeFromSpam(req: Request, res: Response, next: NextFunction){
    try {
        const { userId, emailId } = req.body; 
        
        const user = await User.findByPk(userId);
        if (!user) {
            return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));
        }
    
        const spamEmail = await SpamEmail.findOne({
            where: {
                userId: userId,
                emailId: emailId,
            }
        });
    
        if (!spamEmail) {
            return next(new AppError(StatusCodes.NOT_FOUND, 'Email not found in spam'));
        } 
    
        await spamEmail.destroy();
    
        res.status(StatusCodes.OK).json({ message: 'Email removed from spam' });
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}
