import { addLabelToEmail } from "../../controllers/email-labels/controller";
import { Router } from "express";

const emailLabelRouter = Router();

emailLabelRouter.post("/:emailId", addLabelToEmail);

export default emailLabelRouter;