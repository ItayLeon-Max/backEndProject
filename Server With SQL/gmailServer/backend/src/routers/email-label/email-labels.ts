import { addLabelToEmail, removeLabelFromEmail } from "../../controllers/email-labels/controller";
import { Router } from "express";

const emailLabelRouter = Router();

emailLabelRouter.post("/:emailId", addLabelToEmail);
emailLabelRouter.delete("/:emailId",removeLabelFromEmail);

export default emailLabelRouter;