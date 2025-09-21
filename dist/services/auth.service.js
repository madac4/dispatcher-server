"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const nodemailer_1 = __importDefault(require("../config/nodemailer"));
const user_model_1 = __importDefault(require("../models/user.model"));
const auth_types_1 = require("../types/auth.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
const renderEmail_1 = __importDefault(require("../utils/renderEmail"));
exports.AuthService = {
    async validateRegisterRequest(email, password) {
        if (!email || !password) {
            throw new ErrorHandler_1.ErrorHandler('Email and password are required', 400);
        }
        const existingUser = await user_model_1.default.findOne({ email });
        if (existingUser) {
            throw new ErrorHandler_1.ErrorHandler('User already exists', 400);
        }
    },
    async registerUser(email, password) {
        const newUser = new user_model_1.default({ email, password });
        await newUser.save();
        return (0, response_types_1.SuccessResponse)(null, 'User registered successfully');
    },
    async registerModerator(email, password) {
        const newUser = new user_model_1.default({ email, password, role: auth_types_1.UserRole.MODERATOR });
        await newUser.save();
        if (newUser.role === auth_types_1.UserRole.MODERATOR) {
            try {
                const html = await (0, renderEmail_1.default)('moderatorRegistrationEmail', {
                    email,
                    password,
                    role: auth_types_1.UserRole.MODERATOR,
                    frontendOrigin: process.env.FRONTEND_ORIGIN,
                });
                await nodemailer_1.default.sendMail({
                    from: `Dhruv <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: 'Moderator Registration',
                    html,
                });
            }
            catch (error) {
                await newUser.deleteOne();
                throw new ErrorHandler_1.ErrorHandler('Failed to send moderator registration email', 500);
            }
        }
    },
    async registerAdmin(email, password) {
        const newUser = new user_model_1.default({ email, password, role: auth_types_1.UserRole.ADMIN });
        await newUser.save();
        return (0, response_types_1.SuccessResponse)(newUser, 'Admin registered successfully');
    },
};
