import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { createOrder, addLine, reserve, unreserve, cancel, getOne, list, pick, ship } from "../../controllers/orders/orders.controller";

const ordersRouter = Router();

ordersRouter.post("/", authenticateToken, createOrder);
ordersRouter.get("/", authenticateToken, list);
ordersRouter.get("/:id", authenticateToken, getOne);

ordersRouter.post("/:id/lines", authenticateToken, addLine);

// תהליכים
ordersRouter.post("/:id/reserve", authenticateToken, reserve);       // sets status released
ordersRouter.post("/:id/unreserve", authenticateToken, unreserve);   // back to draft
ordersRouter.post("/:id/cancel", authenticateToken, cancel);

ordersRouter.post("/:id/pick", authenticateToken, pick);
ordersRouter.post("/:id/ship", authenticateToken, ship);

export default ordersRouter;