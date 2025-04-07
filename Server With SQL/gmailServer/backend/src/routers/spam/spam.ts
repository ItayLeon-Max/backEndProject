import { moveToSpam, removeFromSpam } from "../../controllers/spam/controller";
import { Router } from "express";

const spamRouter = Router();

spamRouter.post("/", moveToSpam)
spamRouter.delete("/", removeFromSpam)

export default spamRouter;