import { NextFunction, Request, Response } from "express";
import Meetings from "../../models/Meeting";
import AppError from "../../errors/app-error";
import { StatusCodes } from "http-status-codes";

//get all meetings functions

export async function getAllMeetings(req: Request, res: Response, next: NextFunction) {
    try {
        const meetings = await Meetings.findAll();
        res.status(200).json(meetings);
        console.log(`Meetings: ${meetings.length}`);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

// getAllMeetingPerdevelopmentGroup functions

export async function getAllMeetingPerDevelopmentGroupID(req: Request<{developmentGroupId: string}>, res: Response, next: NextFunction) {
    try {
       const { developmentGroupId } = req.params;
       const meetings = await Meetings.findAll({ where: { developmentGroupId } });
         res.status(200).json(meetings);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

// addMeeting functions

export async function addMeeting(req: Request<{developmentGroupId: string, startTime: string, endTime: string, description: string, meetingRoom: string}>, res: Response, next: NextFunction) {
    const { developmentGroupId, startTime, endTime, description, meetingRoom } = req.body;
    try {
        const meeting = await Meetings.create({
            developmentGroupId,
            startTime,
            endTime,
            description,
            meetingRoom
        });
        res.status(201).json(meeting);
        console.log(`created new meeting with id: ${meeting.id}`);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

// deleteMeeting functions

export async function deleteMeeting(req: Request<{id: string}>, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const meeting = await Meetings.findByPk(id);
        if (!meeting) {
            res.status(404).json({ message: `meeting with id ${id} not found` });
            return;
        }
        await meeting.destroy();
        res.status(204).end();
        console.log(`meeting with id: ${id} deleted`);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}

// update meeting functions

export async function updateMeeting(req: Request<{id: string, developmentGroupId: string, startTime: string, endTime: string, description: string, meetingRoom: string}>, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { developmentGroupId, startTime, endTime, description, meetingRoom } = req.body;
        const meeting = await Meetings.findByPk(id);
        if (!meeting) {
            res.status(404).json({ message: `meeting with id ${id} not found` });
            return;
        }
        meeting.developmentGroupId = developmentGroupId;
        meeting.startTime = startTime;
        meeting.endTime = endTime;
        meeting.description = description;
        meeting.meetingRoom = meetingRoom;
        await meeting.save();
        res.status(200).json(meeting);
        console.log(`meeting with id: ${id} updated`);
    } catch (error) {
        next(new AppError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }   
}



