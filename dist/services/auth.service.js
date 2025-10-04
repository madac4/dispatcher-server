"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("../config/nodemailer"));
const email_confirmation_token_model_1 = __importDefault(require("../models/email-confirmation-token.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const auth_types_1 = require("../types/auth.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
const renderEmail_1 = __importDefault(require("../utils/renderEmail"));
const email_service_1 = require("./email.service");
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
        const confirmationToken = crypto_1.default.randomBytes(32).toString('hex');
        const confirmationTokenDoc = new email_confirmation_token_model_1.default({
            token: confirmationToken,
            userId: newUser._id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await confirmationTokenDoc.save();
        try {
            await email_service_1.EmailService.sendEmail('confirmRegistration', {
                confirmationToken,
                frontendOrigin: process.env.FRONTEND_ORIGIN,
            }, email, 'Confirm Your Click Permit Account');
        }
        catch (error) {
            await newUser.deleteOne();
            await confirmationTokenDoc.deleteOne();
            throw new ErrorHandler_1.ErrorHandler('Failed to send confirmation email', 500);
        }
        return (0, response_types_1.SuccessResponse)(null, 'User registered successfully. Please check your email to confirm your account.');
    },
    async registerModerator(email, password) {
        const newUser = new user_model_1.default({ email, password, role: auth_types_1.UserRole.MODERATOR });
        await newUser.save();
        if (newUser.role === auth_types_1.UserRole.MODERATOR) {
            const emailData = {
                email,
                password,
                role: auth_types_1.UserRole.MODERATOR,
                frontendOrigin: process.env.FRONTEND_ORIGIN,
            };
            await email_service_1.EmailService.sendEmail('moderatorRegistrationEmail', emailData, email, 'Moderator Registration');
        }
        return (0, response_types_1.SuccessResponse)(newUser, 'Moderator registered successfully');
    },
    async registerAdmin(email, password) {
        const newUser = new user_model_1.default({ email, password, role: auth_types_1.UserRole.ADMIN });
        await newUser.save();
        return (0, response_types_1.SuccessResponse)(newUser, 'Admin registered successfully');
    },
    async confirmEmail(token) {
        if (!token) {
            throw new ErrorHandler_1.ErrorHandler('Confirmation token is required', 400);
        }
        const confirmationTokenDoc = await email_confirmation_token_model_1.default.findOne({
            token,
        });
        if (!confirmationTokenDoc) {
            throw new ErrorHandler_1.ErrorHandler('Invalid or expired confirmation token', 400);
        }
        if (confirmationTokenDoc.expiresAt < new Date()) {
            await confirmationTokenDoc.deleteOne();
            await user_model_1.default.findById(confirmationTokenDoc.userId).deleteOne();
            throw new ErrorHandler_1.ErrorHandler('Confirmation token has expired', 400);
        }
        const user = await user_model_1.default.findById(confirmationTokenDoc.userId);
        if (!user) {
            await confirmationTokenDoc.deleteOne();
            await user_model_1.default.findById(confirmationTokenDoc.userId).deleteOne();
            throw new ErrorHandler_1.ErrorHandler('User not found', 404);
        }
        if (user.isEmailConfirmed) {
            await confirmationTokenDoc.deleteOne();
            throw new ErrorHandler_1.ErrorHandler('Email is already confirmed', 400);
        }
        user.isEmailConfirmed = true;
        await user.save();
        await confirmationTokenDoc.deleteOne();
        return (0, response_types_1.SuccessResponse)(null, 'Email confirmed successfully');
    },
    async resendConfirmationEmail(email) {
        if (!email) {
            throw new ErrorHandler_1.ErrorHandler('Email is required', 400);
        }
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            throw new ErrorHandler_1.ErrorHandler('User not found', 404);
        }
        if (user.isEmailConfirmed) {
            throw new ErrorHandler_1.ErrorHandler('Email is already confirmed', 400);
        }
        await email_confirmation_token_model_1.default.deleteMany({ userId: user._id });
        const confirmationToken = crypto_1.default.randomBytes(32).toString('hex');
        const confirmationTokenDoc = new email_confirmation_token_model_1.default({
            token: confirmationToken,
            userId: user._id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });
        await confirmationTokenDoc.save();
        try {
            const html = await (0, renderEmail_1.default)('confirmRegistration', {
                confirmationToken,
                frontendOrigin: process.env.FRONTEND_ORIGIN,
            });
            await nodemailer_1.default.sendMail({
                from: `Click Permit <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Confirm Your Click Permit Account',
                html,
            });
        }
        catch (error) {
            await confirmationTokenDoc.deleteOne();
            throw new ErrorHandler_1.ErrorHandler('Failed to send confirmation email', 500);
        }
        return (0, response_types_1.SuccessResponse)(null, 'Confirmation email sent successfully');
    },
    async updatePassword(userId, currentPassword, password) {
        const user = await user_model_1.default.findById(userId).select('+password');
        if (!user)
            throw new ErrorHandler_1.ErrorHandler('User not found', 404);
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch)
            throw new ErrorHandler_1.ErrorHandler('Invalid current password', 400);
        const isSamePassword = await user.comparePassword(password);
        if (isSamePassword) {
            throw new ErrorHandler_1.ErrorHandler('New password cannot be the same as the old password', 400);
        }
        user.password = password;
        await user.save();
        await email_service_1.EmailService.sendEmail('passwordChangedEmail', {}, user.email, 'Password Changed');
        return (0, response_types_1.SuccessResponse)(null, 'Password changed successfully');
    },
};
