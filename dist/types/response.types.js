"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuccessResponse = SuccessResponse;
exports.ErrorResponse = ErrorResponse;
exports.PaginatedResponse = PaginatedResponse;
exports.CreatePaginationMeta = CreatePaginationMeta;
function SuccessResponse(data = null, message, status = 200) {
    return {
        status,
        success: true,
        message,
        data,
    };
}
function ErrorResponse(message, status = 500) {
    return {
        status,
        success: false,
        message,
        data: {},
    };
}
function PaginatedResponse(data, meta, message, status = 200) {
    return {
        status,
        success: true,
        message,
        meta,
        data,
    };
}
function CreatePaginationMeta(totalItems, page, limit) {
    return {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: Number(page),
        itemsPerPage: Number(limit),
    };
}
