import { Request, Response, NextFunction } from 'express';
import BankAccount from '../../models/bankAccount';
import { v4 as uuidv4 } from 'uuid';
import { RequestHandler } from "express";

interface Params {
    id: string;
  }
  
  interface AuthenticatedRequest<Params = {}> extends Request<Params> {
    user: {
      id: string;
      email: string;
      role: string;
      [key: string]: any;
    };
  }

export async function getAllAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.user.id;
        const accounts = await BankAccount.findAll({ where: { userId } });
        res.json(accounts);
    } catch (error) {
        next(error);
    }
}

export async function createAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {

        console.log('Decoded user:', req.user);

        const { accountNumber, currency, balance } = req.body;
        const userId = req.user.id;

        const newAccount = await BankAccount.create({
            id: uuidv4(),
            accountNumber,
            currency,
            balance: balance || 0,
            userId
        });

        res.status(201).json(newAccount);
    } catch (error) {
        next(error);
    }
}

export const getAccountById = async (
    req: AuthenticatedRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const accountId = req.params.id;
      const userId = req.user.id;
  
      const account = await BankAccount.findOne({ where: { id: accountId, userId } });
  
      if (!account) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }
  
      res.json(account);
    } catch (error) {
      next(error);
    }
  };