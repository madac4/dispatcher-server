"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeInvitation = exports.createInvitation = void 0;
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("../config/nodemailer"));
const invitation_model_1 = __importDefault(require("../models/invitation.model"));
const team_model_1 = __importDefault(require("../models/team.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const auth_types_1 = require("../types/auth.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
const renderEmail_1 = __importDefault(require("../utils/renderEmail"));
exports.createInvitation = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { email, role } = req.body;
    if (!email) {
        return next(new ErrorHandler_1.ErrorHandler('Email is required', 400));
    }
    const existingInvitation = await invitation_model_1.default.findOne({
        email,
        used: false,
        expiresAt: {
            $gt: Date.now(),
        },
    });
    if (existingInvitation) {
        return next(new ErrorHandler_1.ErrorHandler('An active invitation already exists for this email', 409));
    }
    const existingUser = await user_model_1.default.findOne({ email });
    if (existingUser) {
        return next(new ErrorHandler_1.ErrorHandler('User already exists', 409));
    }
    let team = await team_model_1.default.findOne({ owner: req.user.userId });
    if (!team) {
        team = new team_model_1.default({
            owner: req.user.userId,
            members: [],
        });
        await team.save();
    }
    const inviteCode = crypto_1.default.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = new invitation_model_1.default({
        code: inviteCode,
        email,
        role: role || auth_types_1.UserRole.USER,
        expiresAt,
        teamId: team._id,
        invitedBy: req.user.userId,
    });
    await invitation.save();
    try {
        const html = await (0, renderEmail_1.default)('invitationEmail', {
            inviteCode,
            expiresAt,
        });
        await nodemailer_1.default.sendMail({
            from: `Dhruv <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Dhruv Invitation',
            html,
        });
    }
    catch (error) {
        console.error('Error sending email:', error);
        await invitation.deleteOne();
        return next(new ErrorHandler_1.ErrorHandler('Failed to send invitation email', 500));
    }
    console.log(`Invite code for ${email}: ${inviteCode}`);
    res.status(201).json({
        message: 'Invitation created successfully',
        invitation,
    });
});
exports.removeInvitation = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { inviteId } = req.params;
    const invitation = await invitation_model_1.default.findById(inviteId);
    if (!invitation) {
        return next(new ErrorHandler_1.ErrorHandler('Invitation not found', 404));
    }
    await invitation.deleteOne();
    res.status(200).json({
        message: 'Invitation removed successfully',
        invitation,
    });
});
