import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { getMyAccount } from "../../controllers/bankAccount/controller";

const bankAccountRouter = Router();

bankAccountRouter.get("/me", authenticateToken, getMyAccount);

export default bankAccountRouter;