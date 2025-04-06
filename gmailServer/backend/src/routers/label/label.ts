import { createLabel, deleteLabel, getLabels, updateLabel } from "../../controllers/label/controller";
import { Router } from "express";

const labelRouter = Router();

labelRouter.get("/", getLabels);
labelRouter.post("/", createLabel);
labelRouter.put("/:labelId", updateLabel);
labelRouter.delete("/:labelId", deleteLabel); 

export default labelRouter; 