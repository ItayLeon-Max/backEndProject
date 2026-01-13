import { Router } from "express";
import validation from "../../middlewares/validation";
import { registerValidator, loginValidator } from "../../controllers/auth/validator";
import { register, login } from "../../controllers/auth/controller";

const authRouter = Router();

authRouter.post("/register", validation(registerValidator), register);
authRouter.post("/login", validation(loginValidator), login);

export default authRouter;