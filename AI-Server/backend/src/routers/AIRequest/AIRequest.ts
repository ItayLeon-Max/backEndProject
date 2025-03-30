import { Router } from "express";
import { createAIRequest, getAllAIRequests } from "../../controllers/AIRequest/controller";

const AIRequestRouter = Router()

//AIRequest routes
AIRequestRouter.get('/', getAllAIRequests)
AIRequestRouter.post('/', createAIRequest)

export default AIRequestRouter