import { getDrafts } from "../../controllers/draft/controller";
import { Router } from "express";

const draftRouter = Router();

draftRouter.get("/:userId", getDrafts); // get all drafts for a user

export default draftRouter;