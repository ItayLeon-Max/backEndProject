import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { requireAdmin } from "../../middlewares/requireRole";

import { getAdmins, getUsers, updateUserRole, deleteUser } from "../../controllers/admin/controller";

const adminRouter = Router();

adminRouter.use(authenticateToken, requireAdmin);

// טבלה נפרדת למנהלים
adminRouter.get("/admins", getAdmins);

// טבלה נפרדת למשתמשים רגילים
adminRouter.get("/users", getUsers);

// מה שכבר יש לך:
adminRouter.patch("/users/:id/role", updateUserRole);
adminRouter.delete("/users/:id", deleteUser);

export default adminRouter;