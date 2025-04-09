import { deleteSentEmail } from "../../controllers/sentEmail/controller";
import { Router } from "express";

const sentEmailRouter = Router();

sentEmailRouter.delete("/:emailId", deleteSentEmail);

export default sentEmailRouter;