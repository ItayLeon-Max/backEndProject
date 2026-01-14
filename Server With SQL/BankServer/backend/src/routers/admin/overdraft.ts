import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { requireAdmin } from "../../middlewares/requireRole";

import {
  getPendingOverdraftRequests,
  approveOverdraftRequest,
  rejectOverdraftRequest,
} from "../../controllers/admin/overdraft.controller";

const overdraftAdminRouter = Router();

// כל הבקשות בהמתנה
overdraftAdminRouter.get(
  "/overdraft/requests",
  authenticateToken,
  requireAdmin,
  getPendingOverdraftRequests
);

// אישור
overdraftAdminRouter.post(
  "/overdraft/requests/:accountId/approve",
  authenticateToken,
  requireAdmin,
  approveOverdraftRequest
);

// דחייה
overdraftAdminRouter.post(
  "/overdraft/requests/:accountId/reject",
  authenticateToken,
  requireAdmin,
  rejectOverdraftRequest
);

export default overdraftAdminRouter;