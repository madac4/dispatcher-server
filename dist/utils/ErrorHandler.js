"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = exports.CatchAsyncErrors = exports.ErrorHandler = void 0;
const response_types_1 = require("../types/response.types");
class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ErrorHandler = ErrorHandler;
const CatchAsyncErrors = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.CatchAsyncErrors = CatchAsyncErrors;
const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err instanceof ErrorHandler ? err.statusCode : 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json((0, response_types_1.ErrorResponse)(message, statusCode));
};
exports.globalErrorHandler = globalErrorHandler;
