"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendContactForm = void 0;
const email_service_1 = require("../services/email.service");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
const validators_1 = require("../utils/validators");
exports.sendContactForm = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { firstName, lastName, email, phone, subject, company, message, } = req.body;
    if (!firstName || !lastName) {
        return next(new ErrorHandler_1.ErrorHandler('First name and last name are required', 400));
    }
    if (!email) {
        return next(new ErrorHandler_1.ErrorHandler('Email is required', 400));
    }
    if (!phone) {
        return next(new ErrorHandler_1.ErrorHandler('Phone is required', 400));
    }
    if (!subject) {
        return next(new ErrorHandler_1.ErrorHandler('Subject is required', 400));
    }
    if (!(0, validators_1.validateEmail)(email)) {
        return next(new ErrorHandler_1.ErrorHandler('Invalid email', 400));
    }
    if (!message) {
        return next(new ErrorHandler_1.ErrorHandler('Message is required', 400));
    }
    try {
        const emailData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : null,
            subject: subject.trim(),
            company: company ? company.trim() : null,
            message: message.trim(),
        };
        if (!process.env.ADMIN_EMAIL) {
            return next(new ErrorHandler_1.ErrorHandler('Email configuration not found', 500));
        }
        await email_service_1.EmailService.sendEmail('contactFormEmail', emailData, process.env.ADMIN_EMAIL, `New Contact Form Submission: ${emailData.subject}`);
        if (process.env.SEND_CONFIRMATION_EMAIL === 'true') {
            const confirmationData = {
                firstName: emailData.firstName,
                subject: emailData.subject,
                submissionDate: new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
            };
            await email_service_1.EmailService.sendEmail('contactConfirmationEmail', confirmationData, emailData.email, 'Thank you for contacting Click Permit');
        }
        res.status(200).json((0, response_types_1.SuccessResponse)(null, 'Contact form submitted successfully'));
    }
    catch (error) {
        console.error('Contact form submission error:', error);
        return next(new ErrorHandler_1.ErrorHandler('Failed to submit contact form. Please try again later.', 500));
    }
});
