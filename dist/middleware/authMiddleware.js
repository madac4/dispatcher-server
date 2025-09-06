"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ErrorHandler_1 = require("../utils/ErrorHandler");
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return next(new ErrorHandler_1.ErrorHandler('No token provided', 401));
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decoded.id || !decoded.role) {
            return next(new ErrorHandler_1.ErrorHandler('Invalid token payload', 401));
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        return next(new ErrorHandler_1.ErrorHandler('Invalid token', 401));
    }
};
exports.authMiddleware = authMiddleware;
