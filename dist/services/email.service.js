"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("../config/nodemailer"));
const ErrorHandler_1 = require("../utils/ErrorHandler");
const renderEmail_1 = __importDefault(require("../utils/renderEmail"));
exports.EmailService = {
    async sendEmail(template, data, to, subject) {
        try {
            const html = await (0, renderEmail_1.default)(template, data);
            await nodemailer_1.default.sendMail({
                from: `Click Permit <${process.env.EMAIL_USER}>`,
                to: to,
                subject: subject,
                html,
            });
        }
        catch (error) {
            throw new ErrorHandler_1.ErrorHandler('Failed to send email', 500);
        }
    },
};
