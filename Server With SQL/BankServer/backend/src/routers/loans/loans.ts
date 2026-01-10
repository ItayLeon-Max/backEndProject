import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { requestLoanController } from "../../controllers/loan/controller";

const loansRouter = Router();

loansRouter.post("/request", authenticateToken, requestLoanController);

export default loansRouter;