import { moveToSpam, removeFromSpam } from "../../controllers/spam/controller";
import { Router } from "express";

const spamRouter = Router();

spamRouter.post("/add", moveToSpam)
spamRouter.delete("/remove", removeFromSpam)

export default spamRouter;