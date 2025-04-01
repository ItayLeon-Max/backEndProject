import { createLabel, getLabels } from "../../controllers/label/controller";
import { Router } from "express";

const labelRouter = Router();

labelRouter.get("/", getLabels);
labelRouter.post("/", createLabel);

export default labelRouter; 