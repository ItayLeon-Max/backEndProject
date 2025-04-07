import Joi from "joi";

export const addMeetingValidator = Joi.object({
    developmentGroupId: Joi.string().min(5).required(),
    startTime: Joi.date().required(),
    endTime: Joi.date().required(),
    description: Joi.string().min(10).required(),
    meetingRoom: Joi.string().min(10).required(),
});

export const updateMeetingValidator = addMeetingValidator;

// export const sendReminderValidator = Joi.object({
//     name: Joi.string().min(5).required()
// });