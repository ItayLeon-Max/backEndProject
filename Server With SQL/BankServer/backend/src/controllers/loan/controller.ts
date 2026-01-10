import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/app-error";
import { requestLoan } from "../../services/loan.service";

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string; [key: string]: any };
}

export async function requestLoanController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user.id;
    const { principal, months, annualRate } = req.body as {
      principal: number;
      months: number;
      annualRate: number;
    };

    if (principal === undefined || months === undefined || annualRate === undefined) {
      return next(new AppError(StatusCodes.BAD_REQUEST, "principal, months, annualRate are required"));
    }

    const result = await requestLoan({
      userId,
      principal: Number(principal),
      months: Number(months),
      annualRate: Number(annualRate),
    });

    res.status(StatusCodes.CREATED).json(result);
  } catch (e) {
    next(e);
  }
}