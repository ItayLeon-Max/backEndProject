import { createAccount, getAccountById, getAllAccounts } from "../../controllers/bankAccount/controller";
import { Router, Request } from "express";

interface AuthenticatedRequest<Params = {}> extends Request<Params> {
  user: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

const bankAccountRouter = Router();

bankAccountRouter.get("/", getAllAccounts);
bankAccountRouter.get("/:id", getAccountById);
bankAccountRouter.post("/newAccount", createAccount);

export default bankAccountRouter;