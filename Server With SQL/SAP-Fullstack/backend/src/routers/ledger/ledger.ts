import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { list, byRef } from "../../controllers/ledger/ledger.controller";

const ledgerRouter = Router();

ledgerRouter.get("/", authenticateToken, list);
ledgerRouter.get("/ref/:refType/:refId", authenticateToken, byRef);

export default ledgerRouter;