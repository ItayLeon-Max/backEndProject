import { createHmac } from "crypto";
import { sign, verify } from 'jsonwebtoken'; 
import config from 'config'
import { Request, Response, NextFunction } from 'express';
import User from "../../models/user";
import AppError from "../../errors/app-error";
import { StatusCodes } from "http-status-codes";
import socket from "../../io/io";


// hash password
export function hashPassword(password: string): string {
    return createHmac('sha256', config.get<string>('app.secret'))
            .update(password)
            .digest('hex')
}

// get all users
export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

// login
export async function login(req: Request<{}, {}, {email: string, password: string}>, res: Response, next: NextFunction) {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({
            where: {
                email,
                password: hashPassword(password)
            },
        });

        if (!user) return next(new AppError(StatusCodes.UNAUTHORIZED, 'wrong credentials'));

        const jwt = sign(user.get({ plain: true }), config.get<string>('app.jwtSecret'));

        res.json({ 
            jwt,
            messages: `Welcome ${user.name}!` 
        });
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

// register
export async function register(req: Request<{}, {}, {name: string, password: string, email: string}>, res: Response, next: NextFunction) {
    try {
        const { name, password, email } = req.body;

        const existingUser = await User.findOne({
            where: { email },
        });

        if (existingUser) return next(new AppError(StatusCodes.BAD_REQUEST, 'Email already in use'));

        const user = await User.create({
            name,
            email, 
            password: hashPassword(password),
        });

        res.json(user);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

// delete user
export async function deleteUser(req: Request<{id: string}, {}, {}>, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'user not found'));

        await user.destroy();
        res.json({ message: 'user deleted' });
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

// update user
export async function updateUser(req: Request<{id: string}, {}, {name: string, password: string, email: string, role: string}>, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { name, email, password } = req.body;
        const user = await User.findByPk(id);

        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'user not found'));

        user.name = name;
        user.email = email;
        user.password = hashPassword(password);

        await user.save();
        res.json(user);
    } catch (e) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

// logout with userId

export async function logout(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
        const { id: userId } = req.params;

        if (!userId) return next(new AppError(StatusCodes.BAD_REQUEST, 'Missing userId'));

        const user = await User.findByPk(userId);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));

        socket.emit("user:login", {
            id: user.id,
            name: user.name,
            username: user.email,
            time: new Date().toISOString(),
          });
          
          socket.emit("user:online", {
            id: user.id,
            name: user.name,
            username: user.email,
            time: new Date().toISOString(),
          });

        res.json({ message: `User ${user.name} logged out` });
    } catch (e: any) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, e.message));
    }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));

    const token = sign({ id: user.id }, config.get<string>('app.jwtSecret'), {
        expiresIn: '15m'
    });

    const resetLink = `http://localhost:3000/auth/reset-password/${token}`;
    console.log("🔗 Reset password link:", resetLink);

    res.json({ message: 'Reset link sent to email' });
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const decoded: any = verify(token, config.get<string>('app.jwtSecret'));

        const user = await User.findByPk(decoded.id);
        if (!user) return next(new AppError(StatusCodes.NOT_FOUND, 'User not found'));

        user.password = hashPassword(password);
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (e) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token'));
    }
}