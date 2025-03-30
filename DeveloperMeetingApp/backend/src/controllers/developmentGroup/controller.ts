import { NextFunction, Request, Response } from "express";
import "../../models/developmentGroup";
import developmentGroup from "../../models/developmentGroup";
import DevelopmentGroups from "../../models/developmentGroup";
import AppError from "../../errors/app-error";
import { StatusCodes } from "http-status-codes";
import { verify } from "jsonwebtoken";
import config from "config";


//get all development groups functions
export async function getAllDevelopmentGroups(req: Request, res: Response, next: NextFunction) {
    try {
        const developmentGroups = await developmentGroup.findAll()
        res.status(200).json(developmentGroups);
        //print size of developmentGroups
        console.log(`Development Groups: ${developmentGroups.length}`);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

// add DevelopmentGroup functions (only admin can add development groups)
export async function addDevelopmentGroup(
    req: Request<{}, {}, { name: string }>,
    res: Response,
    next: NextFunction
) {
    const { name } = req.body;

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new AppError(StatusCodes.UNAUTHORIZED, 'Token not provided'));
        }
        const token = authHeader.split(' ')[1];
        const decoded = verify(token, config.get<string>('app.jwtSecret')) as { id: string, userName: string, role: string };
        if (decoded.role.toLowerCase() !== 'admin') {
            return next(new AppError(StatusCodes.FORBIDDEN, 'Only admins can add development groups.'));
        }
        const developmentGroup = await DevelopmentGroups.create({ name });
        res.status(StatusCodes.CREATED).json(developmentGroup);
        console.log(`created new developmentGroup with id: ${developmentGroup.id}`);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

// delete DevelopmentGroup functions (only admin can delete development groups)

export async function deleteDevelopmentGroup(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next(new AppError(StatusCodes.UNAUTHORIZED, 'Token not provided'));
        const token = authHeader.split(' ')[1];
        const decoded = verify(token, config.get<string>('app.jwtSecret')) as { id: string, userName: string, role: string };
        if (decoded.role.toLowerCase() !== 'admin') return next(new AppError(StatusCodes.FORBIDDEN, 'Only admins can delete development groups.'));
        const { id } = req.params;
        const developmentGroup = await DevelopmentGroups.findByPk(id);
        if (!developmentGroup) return next(new AppError(StatusCodes.NOT_FOUND, `developmentGroup with id ${id} not found`));
        await developmentGroup.destroy();
        res.status(StatusCodes.NO_CONTENT).end();
        console.log(`developmentGroup with id: ${id} deleted`);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

// update DevelopmentGroup functions (only admin can update development groups)
export async function updateDevelopmentGroup(
    req: Request<{ id: string }, {}, { name: string }>,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next(new AppError(StatusCodes.UNAUTHORIZED, 'Token not provided'));
        const token = authHeader.split(' ')[1];
        const decoded = verify(token, config.get<string>('app.jwtSecret')) as { id: string, userName: string, role: string };
        if (decoded.role.toLowerCase() !== 'admin') return next(new AppError(StatusCodes.FORBIDDEN, 'Only admins can update development groups.'));
        const { id } = req.params;
        const { name } = req.body;
        const developmentGroup = await DevelopmentGroups.findByPk(id);
        if (!developmentGroup) return next(new AppError(StatusCodes.NOT_FOUND, `developmentGroup with id ${id} not found`));
        developmentGroup.name = name;
        await developmentGroup.save();
        res.status(StatusCodes.OK).json(developmentGroup);
        console.log(`developmentGroup with id: ${id} updated`);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}



