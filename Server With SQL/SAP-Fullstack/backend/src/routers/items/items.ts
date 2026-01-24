import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { getOne, list, create, update, remove } from "../../controllers/item/items.controller";

const itemsRouter = Router();

itemsRouter.get("/", authenticateToken, list);
itemsRouter.get("/:id", authenticateToken, getOne);

itemsRouter.post("/", authenticateToken, create);
itemsRouter.put("/:id", authenticateToken, update);
itemsRouter.delete("/:id", authenticateToken, remove);

export default itemsRouter;