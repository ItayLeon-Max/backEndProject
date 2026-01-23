import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { create, list, getOne, update, remove } from "../../controllers/warehouses/warehouses.controller";

const warehousesRouter = Router();

warehousesRouter.post("/", authenticateToken, create);
warehousesRouter.get("/", authenticateToken, list);
warehousesRouter.get("/:id", authenticateToken, getOne);
warehousesRouter.put("/:id", authenticateToken, update);
warehousesRouter.delete("/:id", authenticateToken, remove);

export default warehousesRouter;