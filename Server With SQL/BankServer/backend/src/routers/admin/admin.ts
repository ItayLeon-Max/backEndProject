import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { requireAdmin } from "../../middlewares/requireRole";

import { getAllUsers, updateUserRole, deleteUser } from "../../controllers/admin/controller";
import { getUserLoansOverview, chargeLateFee } from "../../controllers/admin/loans.controller";

const adminRouter = Router();

// users
adminRouter.get("/users", authenticateToken, requireAdmin, getAllUsers);
adminRouter.put("/users/:id/role", authenticateToken, requireAdmin, updateUserRole);
adminRouter.delete("/users/:id", authenticateToken, requireAdmin, deleteUser);

// loans
adminRouter.get("/users/:id/loans", authenticateToken, requireAdmin, getUserLoansOverview);
adminRouter.post("/users/:id/loans/:loanId/late-fee", authenticateToken, requireAdmin, chargeLateFee);

export default adminRouter;