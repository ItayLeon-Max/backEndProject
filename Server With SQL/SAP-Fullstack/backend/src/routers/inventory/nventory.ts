import { Router } from "express";
import { receive, issue, transfer, stock } from "../../controllers/inventory/inventory.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";
// אם יש לך requireAdmin / requireRole אפשר להוסיף פה לפי צורך

const inventoryRouter = Router();

// בסיס: חייב להיות מחובר (ERP פנימי)
inventoryRouter.post("/receive", authenticateToken, receive);
inventoryRouter.post("/issue", authenticateToken, issue);
inventoryRouter.post("/transfer", authenticateToken, transfer);

inventoryRouter.get("/stock", authenticateToken, stock);

export default inventoryRouter;