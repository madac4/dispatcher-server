"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesMiddleware = void 0;
const ErrorHandler_1 = require("../utils/ErrorHandler");
const rolesMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ErrorHandler_1.ErrorHandler('Authentication required', 401));
        }
        const userRole = req.user.role;
        if (!allowedRoles.includes(userRole)) {
            return next(new ErrorHandler_1.ErrorHandler(`Access denied. Required roles: ${allowedRoles.join(', ')}`, 403));
        }
        next();
    };
};
exports.rolesMiddleware = rolesMiddleware;
