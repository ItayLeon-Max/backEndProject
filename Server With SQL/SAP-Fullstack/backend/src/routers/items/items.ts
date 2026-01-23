import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { getOne, list } from "../../controllers/item/items.controller";

const itemsRouter = Router();

itemsRouter.get("/", authenticateToken, list);
itemsRouter.get("/:id", authenticateToken, getOne);

export default itemsRouter;