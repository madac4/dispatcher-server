"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const auth_types_1 = require("../types/auth.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
exports.getUsers = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const users = await user_model_1.default.find({ role: auth_types_1.UserRole.USER });
    res.status(200).json((0, response_types_1.SuccessResponse)(users, 'Users fetched successfully'));
});
