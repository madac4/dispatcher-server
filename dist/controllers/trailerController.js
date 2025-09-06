"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTrailerFile = exports.downloadTrailerFile = exports.getTrailerFiles = exports.uploadTrailerFile = exports.getTrailer = exports.deleteTrailer = exports.updateTrailer = exports.createTrailer = exports.paginatedTrailers = void 0;
const trailer_model_1 = __importDefault(require("../models/trailer.model"));
const gridfs_service_1 = require("../services/gridfs.service");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
exports.paginatedTrailers = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { page, limit, search } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user.userId;
    const totalItems = await trailer_model_1.default.countDocuments({ userId });
    const trailers = await trailer_model_1.default.find({
        userId,
        $or: [
            { licencePlate: { $regex: search || '', $options: 'i' } },
            { unitNumber: { $regex: search || '', $options: 'i' } },
        ],
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const meta = (0, response_types_1.CreatePaginationMeta)(totalItems, page, limit);
    res.status(200).json((0, response_types_1.PaginatedResponse)(trailers, meta));
});
exports.createTrailer = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.userId;
    const { year, make, vin, licencePlate, state, nrOfAxles, unitNumber, length, type, } = req.body;
    if (!licencePlate)
        return next(new ErrorHandler_1.ErrorHandler('Licence plate is required', 400));
    if (!unitNumber)
        return next(new ErrorHandler_1.ErrorHandler('Unit number is required', 400));
    const trailer = await trailer_model_1.default.create({
        userId,
        year,
        make,
        vin,
        licencePlate,
        state,
        nrOfAxles,
        unitNumber,
        length,
        type,
    });
    res.status(201).json((0, response_types_1.SuccessResponse)(trailer, 'Trailer created successfully'));
});
exports.updateTrailer = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { trailerId } = req.params;
    const { year, make, vin, licencePlate, state, nrOfAxles, unitNumber, length, type, } = req.body;
    if (!licencePlate)
        return next(new ErrorHandler_1.ErrorHandler('Licence plate is required', 400));
    if (!unitNumber)
        return next(new ErrorHandler_1.ErrorHandler('Unit number is required', 400));
    const existingTrailer = await trailer_model_1.default.findOne({
        _id: trailerId,
        userId: req.user.userId,
    });
    if (!existingTrailer)
        return next(new ErrorHandler_1.ErrorHandler('Trailer not found', 404));
    const updatedTrailer = await trailer_model_1.default.findByIdAndUpdate(trailerId, {
        year,
        make,
        vin,
        licencePlate,
        state,
        nrOfAxles,
        unitNumber,
        length,
        type,
    }, { new: true });
    res.status(200).json((0, response_types_1.SuccessResponse)(updatedTrailer, 'Trailer updated successfully'));
});
exports.deleteTrailer = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { trailerId } = req.params;
    const userId = req.user.userId;
    const trailer = await trailer_model_1.default.findOne({ _id: trailerId, userId });
    if (!trailer)
        return next(new ErrorHandler_1.ErrorHandler('Trailer not found', 404));
    await trailer.deleteOne();
    res.status(200).json((0, response_types_1.SuccessResponse)(null, 'Trailer deleted successfully'));
});
exports.getTrailer = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { trailerId } = req.params;
    const userId = req.user.userId;
    const trailer = await trailer_model_1.default.findOne({ _id: trailerId, userId });
    if (!trailer)
        return next(new ErrorHandler_1.ErrorHandler('Trailer not found', 404));
    res.status(200).json((0, response_types_1.SuccessResponse)(trailer, 'Trailer fetched successfully'));
});
exports.uploadTrailerFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { trailerId } = req.params;
    const userId = req.user.userId;
    const file = req.file;
    if (!file)
        return next(new ErrorHandler_1.ErrorHandler('File is required', 400));
    const trailer = await trailer_model_1.default.findOne({ _id: trailerId, userId });
    if (!trailer)
        return next(new ErrorHandler_1.ErrorHandler('Trailer not found', 404));
    try {
        const fileData = await (0, gridfs_service_1.uploadFile)(file);
        const updatedTrailer = await trailer_model_1.default.findByIdAndUpdate(trailerId, {
            $push: {
                files: { ...fileData, originalname: file.originalname },
            },
        }, { new: true }).lean();
        if (!updatedTrailer)
            return next(new ErrorHandler_1.ErrorHandler('Failed to update trailer', 500));
        res.status(200).json((0, response_types_1.SuccessResponse)(updatedTrailer, 'File uploaded successfully'));
    }
    catch (error) {
        return next(new ErrorHandler_1.ErrorHandler(`File upload failed: ${error.message}`, 500));
    }
});
exports.getTrailerFiles = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { trailerId } = req.params;
    const userId = req.user.userId;
    const trailer = await trailer_model_1.default.findOne({ _id: trailerId, userId });
    if (!trailer)
        return next(new ErrorHandler_1.ErrorHandler('Trailer not found', 404));
    const files = trailer.files;
    res.status(200).json((0, response_types_1.SuccessResponse)(files, 'Files fetched successfully'));
});
exports.downloadTrailerFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { filename } = req.params;
    const userId = req.user.userId;
    const trailer = await trailer_model_1.default.findOne({
        userId,
        'files.filename': filename,
    }).lean();
    if (!trailer)
        return next(new ErrorHandler_1.ErrorHandler('File not found or access denied', 404));
    const fileData = trailer.files.find((file) => file.filename === filename);
    if (!fileData)
        return next(new ErrorHandler_1.ErrorHandler('File metadata not found', 404));
    try {
        const exists = await (0, gridfs_service_1.fileExists)(filename);
        if (!exists) {
            return next(new ErrorHandler_1.ErrorHandler('File not found in storage', 404));
        }
        res.setHeader('Content-Disposition', `attachment; filename="${fileData.originalname}"`);
        res.setHeader('Content-Type', fileData.contentType);
        const fileStream = await (0, gridfs_service_1.getFile)(filename);
        fileStream.pipe(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.ErrorHandler(`File download failed: ${error.message}`, 500));
    }
});
exports.deleteTrailerFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { filename } = req.params;
    const userId = req.user.userId;
    const trailer = await trailer_model_1.default.findOne({
        userId,
        'files.filename': filename,
    });
    if (!trailer)
        return next(new ErrorHandler_1.ErrorHandler('File not found or access denied', 404));
    try {
        await trailer_model_1.default.updateOne({ userId }, { $pull: { files: { filename } } });
        await (0, gridfs_service_1.deleteFile)(filename);
        res.status(200).json((0, response_types_1.SuccessResponse)(null, 'File deleted successfully'));
    }
    catch (error) {
        return next(new ErrorHandler_1.ErrorHandler(`File deletion failed: ${error.message}`, 500));
    }
});
