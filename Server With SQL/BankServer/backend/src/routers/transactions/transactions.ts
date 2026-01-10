import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { transfer, deposit, withdraw, getMyTransactions } from "../../controllers/transactions/controller";

const transactionsRouter = Router();

transactionsRouter.post("/transfer", authenticateToken, transfer);
transactionsRouter.post("/deposit", authenticateToken, deposit);
transactionsRouter.post("/withdraw", authenticateToken, withdraw);
transactionsRouter.get("/me", authenticateToken, getMyTransactions);

export default transactionsRouter;