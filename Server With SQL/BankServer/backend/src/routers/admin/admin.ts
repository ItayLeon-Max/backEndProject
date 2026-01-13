// src/routers/admin/admin.ts
import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { requireAdmin } from "../../middlewares/requireRole";
import { deleteUser, getAllUsers, updateUserRole } from "../../controllers/admin/controller";

const adminRouter = Router();

adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get("/users", getAllUsers);
adminRouter.patch("/users/:id/role", updateUserRole);
adminRouter.delete("/users/:id", deleteUser);

export default adminRouter;