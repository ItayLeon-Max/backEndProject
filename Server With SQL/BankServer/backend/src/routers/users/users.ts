import { Router } from "express";
import { authenticateToken } from "../../middlewares/authMiddleware";
import { getMe, updateMe, changeMyPassword } from "../../controllers/users/controller";

const usersRouter = Router();

usersRouter.get("/me", authenticateToken, getMe);
usersRouter.put("/me", authenticateToken, updateMe);
usersRouter.post("/me/password", authenticateToken, changeMyPassword);

export default usersRouter;