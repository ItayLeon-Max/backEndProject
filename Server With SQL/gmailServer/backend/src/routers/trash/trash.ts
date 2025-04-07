import { deleteEmailForEver, getTrash, moveEmailToTrash } from "../../controllers/trash/controller";
import { Router } from "express";

const trashRouter = Router();

trashRouter.get("/:userId", getTrash);
trashRouter.post("/:emailId/:userId", moveEmailToTrash);
trashRouter.delete("/:emailId", deleteEmailForEver);

export default trashRouter;