import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import {
  createTransfer,
  addLine,
  submitTransfer,
  receiveTransfer,
  cancelTransfer,
  getTransfer,
  listTransfers,
} from "../../controllers/transfers/transfers.controller";

const transfersRouter = Router();

transfersRouter.post("/", authenticateToken, createTransfer);
transfersRouter.get("/", authenticateToken, listTransfers);
transfersRouter.get("/:id", authenticateToken, getTransfer);

transfersRouter.post("/:id/lines", authenticateToken, addLine);

transfersRouter.post("/:id/submit", authenticateToken, submitTransfer);
transfersRouter.post("/:id/receive", authenticateToken, receiveTransfer);
transfersRouter.post("/:id/cancel", authenticateToken, cancelTransfer);

export default transfersRouter;

export {};