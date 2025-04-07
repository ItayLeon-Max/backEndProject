import { Router } from "express";
import { addTask, deleteTask, getAllTasks, getTaskById, getTasksByUser, sendTask, updateTask } from "../controllers/tasks/controller";
import validation from "../middlewares/validation";
import { createTaskValidator, updateTaskValidator } from "../controllers/tasks/validator";

const taskRouter = Router();

// task routes
taskRouter.get('/', getAllTasks)
taskRouter.get('/:id', getTaskById)
taskRouter.get('/user/:userId', getTasksByUser)
taskRouter.post('/', validation(createTaskValidator) ,addTask)
taskRouter.put('/:id', validation(updateTaskValidator) ,updateTask)
taskRouter.delete('/:id', deleteTask)
taskRouter.post('/reminder/:id', sendTask)

export default taskRouter;