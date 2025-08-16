"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const ErrorHandler_1 = require("../utils/ErrorHandler");
const response_types_1 = require("../types/response.types");
exports.changePassword = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) {
        return next(new ErrorHandler_1.ErrorHandler('All fields are required', 400));
    }
    if (newPassword !== confirmPassword) {
        return next(new ErrorHandler_1.ErrorHandler('Passwords do not match', 400));
    }
    const user = await user_model_1.default.findById(req.user.userId).select('+password');
    if (!user) {
        return next(new ErrorHandler_1.ErrorHandler('User not found', 404));
    }
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
        return next(new ErrorHandler_1.ErrorHandler('Invalid old password', 400));
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json((0, response_types_1.SuccessResponse)('Password changed successfully'));
});
