import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { getMyOverdraft, requestOverdraftIncrease } from "../../controllers/overdraft/controller";

const overdraftRouter = Router();

overdraftRouter.get("/me", authenticateToken, getMyOverdraft);
overdraftRouter.post("/me/request", authenticateToken, requestOverdraftIncrease);

export default overdraftRouter;