import { Router } from 'express';
import { deleteUser, forgotPassword, getAllUsers, login, logout, register, resetPassword, updateUser } from '../../controllers/auth/controller';
import validation from '../../middlewares/validation';
import { deleteUserValidator, loginValidator, registerValidator, updateUserValidator } from '../../controllers/auth/validator';

const authRouter = Router();

// auth routes
authRouter.get('/', getAllUsers)
authRouter.post('/login', validation(loginValidator), login);
authRouter.post('/register', validation(registerValidator), register);
authRouter.delete('/:id', validation(deleteUserValidator) ,deleteUser);
authRouter.put('/:id', validation(updateUserValidator) ,updateUser);
authRouter.post('/logout/:id', logout);
authRouter.post('/forgot-password', forgotPassword)
authRouter.post('/reset-password/:token', resetPassword)

export default authRouter;