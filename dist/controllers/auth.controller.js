"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.updatePassword = exports.resetPassword = exports.forgotPassword = exports.refreshToken = exports.login = exports.register = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const nodemailer_1 = __importDefault(require("../config/nodemailer"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const refresh_token_model_1 = __importDefault(require("../models/refresh-token.model"));
const reset_token_model_1 = __importDefault(require("../models/reset-token.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const auth_types_1 = require("../types/auth.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
const renderEmail_1 = __importDefault(require("../utils/renderEmail"));
const validators_1 = require("../utils/validators");
exports.register = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { email, password, role } = req.body;
    const user = (0, authMiddleware_1.decodeToken)(req);
    // if (!inviteCode) {
    // 	return next(new ErrorHandler('Invite code is required', 400))
    // }
    if (!email || !password) {
        return next(new ErrorHandler_1.ErrorHandler('Email and password are required', 400));
    }
    // const emailInvitation = await Invitation.findOne({
    // 	email,
    // })
    // if (!emailInvitation) {
    // 	return next(
    // 		new ErrorHandler(
    // 			'You do not have an invitation on this email',
    // 			400,
    // 		),
    // 	)
    // }
    // const invitation = await Invitation.findOne({
    // 	code: inviteCode,
    // 	email,
    // 	used: false,
    // })
    // if (!invitation)
    // 	return next(new ErrorHandler('Invalid or expired invite code', 400))
    // if (invitation.expiresAt < new Date()) {
    // 	return next(new ErrorHandler('Invite code has expired', 400))
    // }
    const existingUser = await user_model_1.default.findOne({ email });
    if (existingUser)
        return next(new ErrorHandler_1.ErrorHandler('User already exists', 400));
    if (user.role !== auth_types_1.UserRole.ADMIN && role === auth_types_1.UserRole.MODERATOR) {
        return next(new ErrorHandler_1.ErrorHandler('You are not authorized to register a moderator', 403));
    }
    const newUser = new user_model_1.default({
        email,
        password,
        role: role || auth_types_1.UserRole.USER,
    });
    await newUser.save();
    if (newUser.role === auth_types_1.UserRole.MODERATOR) {
        try {
            const html = await (0, renderEmail_1.default)('moderatorRegistrationEmail', {
                email,
                password,
                role,
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
            return next(new ErrorHandler_1.ErrorHandler('Failed to send moderator registration email', 500));
        }
    }
    // await Team.findByIdAndUpdate(invitation.teamId, {
    // 	$addToSet: { members: user._id },
    // })
    // invitation.used = true
    // await invitation.save()
    res
        .status(201)
        .json((0, response_types_1.SuccessResponse)(null, `User registered successfully ${role !== auth_types_1.UserRole.USER ? 'with role ' + role : ''}`));
});
exports.login = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password)
        return next(new ErrorHandler_1.ErrorHandler('Email and password are required', 400));
    if (!(0, validators_1.validatePassword)(password)) {
        return next(new ErrorHandler_1.ErrorHandler('Password must contain at least one uppercase letter, one lowercase letter, one number, one special character and be at least 8 characters long', 400));
    }
    const user = await user_model_1.default.findOne({ email }).select('+password');
    if (!user)
        return next(new ErrorHandler_1.ErrorHandler('You do not have an account, please register', 400));
    const isMatch = await user.comparePassword(password);
    if (!isMatch)
        return next(new ErrorHandler_1.ErrorHandler('Invalid email or password', 400));
    const accessToken = user.signAccessToken();
    const refreshToken = user.signRefreshToken();
    const refreshTokenDoc = new refresh_token_model_1.default({
        token: refreshToken,
        userId: user._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await refreshTokenDoc.save();
    res
        .status(200)
        .json((0, response_types_1.SuccessResponse)({ accessToken, refreshToken }, 'Login successful'));
});
exports.refreshToken = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return next(new ErrorHandler_1.ErrorHandler('Refresh token is required', 400));
    const tokenDoc = await refresh_token_model_1.default.findOne({ token: refreshToken });
    if (!tokenDoc)
        return next(new ErrorHandler_1.ErrorHandler('Invalid refresh token', 400));
    if (tokenDoc.expiresAt < new Date()) {
        await tokenDoc.deleteOne();
        return next(new ErrorHandler_1.ErrorHandler('Refresh token expired', 400));
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_SECRET);
    }
    catch (error) {
        await tokenDoc.deleteOne();
        return next(new ErrorHandler_1.ErrorHandler('Invalid refresh token', 400));
    }
    const user = await user_model_1.default.findById(decoded.userId);
    if (!user)
        return next(new ErrorHandler_1.ErrorHandler('User not found', 404));
    const accessToken = user.signAccessToken();
    res
        .status(200)
        .json((0, response_types_1.SuccessResponse)({ accessToken }, 'Refresh token successful'));
});
exports.forgotPassword = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { email } = req.body;
    if (!email)
        return next(new ErrorHandler_1.ErrorHandler('Email is required', 400));
    const user = await user_model_1.default.findOne({ email });
    if (!user)
        return next(new ErrorHandler_1.ErrorHandler('User not found', 404));
    const resetToken = crypto_1.default.randomBytes(32).toString('hex');
    const resetTokenDoc = new reset_token_model_1.default({
        token: resetToken,
        userId: user._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await resetTokenDoc.save();
    try {
        const html = await (0, renderEmail_1.default)('forgotPasswordEmail', {
            resetToken,
            frontendOrigin: process.env.FRONTEND_ORIGIN,
        });
        await nodemailer_1.default.sendMail({
            from: `Dhruv <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Reset Your Dhruv Password',
            html,
        });
    }
    catch (error) {
        await resetTokenDoc.deleteOne();
        return next(new ErrorHandler_1.ErrorHandler('Failed to send reset email', 500));
    }
    res.status(200).json((0, response_types_1.SuccessResponse)(null, `Password reset email sent to ${email}`));
});
exports.resetPassword = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword)
        return next(new ErrorHandler_1.ErrorHandler('All fields are required', 400));
    if (password.length < 8)
        return next(new ErrorHandler_1.ErrorHandler('Password must be at least 8 characters long', 400));
    if (password !== confirmPassword)
        return next(new ErrorHandler_1.ErrorHandler('Passwords do not match', 400));
    const resetTokenDoc = await reset_token_model_1.default.findOne({ token });
    if (!resetTokenDoc)
        return next(new ErrorHandler_1.ErrorHandler('Invalid or expired token', 400));
    if (resetTokenDoc.expiresAt < new Date())
        return next(new ErrorHandler_1.ErrorHandler('Token expired', 400));
    const user = await user_model_1.default.findById(resetTokenDoc.userId).select('+password');
    if (!user)
        return next(new ErrorHandler_1.ErrorHandler('User not found', 404));
    const isMatch = await user.comparePassword(password);
    if (isMatch)
        return next(new ErrorHandler_1.ErrorHandler('New password cannot be the same as the old password', 400));
    user.password = password;
    await user.save();
    await resetTokenDoc.deleteOne();
    res.status(200).json((0, response_types_1.SuccessResponse)(null, 'Password reset successful'));
});
exports.updatePassword = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { userId } = req.user;
    const { currentPassword, password, confirmPassword } = req.body;
    if (!currentPassword || !password || !confirmPassword)
        return next(new ErrorHandler_1.ErrorHandler('All fields are required', 400));
    if (password !== confirmPassword)
        return next(new ErrorHandler_1.ErrorHandler('Passwords do not match', 400));
    const user = await user_model_1.default.findById(userId).select('+password');
    if (!user)
        return next(new ErrorHandler_1.ErrorHandler('User not found', 404));
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch)
        return next(new ErrorHandler_1.ErrorHandler('Invalid current password', 400));
    const isSamePassword = await user.comparePassword(password);
    if (isSamePassword)
        return next(new ErrorHandler_1.ErrorHandler('New password cannot be the same as the old password', 400));
    user.password = password;
    await user.save();
    res.status(200).json((0, response_types_1.SuccessResponse)(null, 'Password changed successfully'));
});
exports.logout = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { userId } = req.user;
    if (!userId)
        return next(new ErrorHandler_1.ErrorHandler('User ID is required', 400));
    const tokenDocs = await refresh_token_model_1.default.find({ userId });
    if (!tokenDocs.length)
        return next(new ErrorHandler_1.ErrorHandler('No refresh tokens found', 401));
    await refresh_token_model_1.default.deleteMany({ userId });
    res.status(200).json((0, response_types_1.SuccessResponse)(null, 'Logout successful'));
});
