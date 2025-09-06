"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTruckFile = exports.downloadTruckFile = exports.getTruckFiles = exports.uploadTruckFile = exports.getTruck = exports.deleteTruck = exports.updateTruck = exports.createTruck = exports.paginatedTrucks = void 0;
const truck_model_1 = __importDefault(require("../models/truck.model"));
const gridfs_service_1 = require("../services/gridfs.service");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
exports.paginatedTrucks = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { page, limit, search } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user.userId;
    const totalItems = await truck_model_1.default.countDocuments({ userId });
    const trucks = await truck_model_1.default.find({
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
    res.status(200).json((0, response_types_1.PaginatedResponse)(trucks, meta));
});
exports.createTruck = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.userId;
    const { year, make, vin, licencePlate, state, nrOfAxles, unitNumber } = req.body;
    if (!licencePlate)
        return next(new ErrorHandler_1.ErrorHandler('Licence plate is required', 400));
    if (!unitNumber)
        return next(new ErrorHandler_1.ErrorHandler('Unit number is required', 400));
    const truck = await truck_model_1.default.create({
        userId,
        year,
        make,
        vin,
        licencePlate,
        state,
        nrOfAxles,
        unitNumber,
    });
    res.status(201).json((0, response_types_1.SuccessResponse)(truck, 'Truck created successfully'));
});
exports.updateTruck = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { truckId } = req.params;
    const { year, make, vin, licencePlate, state, nrOfAxles, unitNumber } = req.body;
    if (!licencePlate)
        return next(new ErrorHandler_1.ErrorHandler('Licence plate is required', 400));
    if (!unitNumber)
        return next(new ErrorHandler_1.ErrorHandler('Unit number is required', 400));
    const existingTruck = await truck_model_1.default.findOne({
        _id: truckId,
        userId: req.user.userId,
    });
    if (!existingTruck)
        return next(new ErrorHandler_1.ErrorHandler('Truck not found', 404));
    const updatedTruck = await truck_model_1.default.findByIdAndUpdate(truckId, { year, make, vin, licencePlate, state, nrOfAxles, unitNumber }, { new: true });
    res.status(200).json((0, response_types_1.SuccessResponse)(updatedTruck, 'Truck updated successfully'));
});
exports.deleteTruck = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { truckId } = req.params;
    const userId = req.user.userId;
    const truck = await truck_model_1.default.findOne({ _id: truckId, userId });
    if (!truck)
        return next(new ErrorHandler_1.ErrorHandler('Truck not found', 404));
    await truck.deleteOne();
    res.status(200).json((0, response_types_1.SuccessResponse)(null, 'Truck deleted successfully'));
});
exports.getTruck = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { truckId } = req.params;
    const userId = req.user.userId;
    const truck = await truck_model_1.default.findOne({ _id: truckId, userId });
    if (!truck)
        return next(new ErrorHandler_1.ErrorHandler('Truck not found', 404));
    res.status(200).json((0, response_types_1.SuccessResponse)(truck, 'Truck fetched successfully'));
});
exports.uploadTruckFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const file = req.file;
    if (!file)
        return next(new ErrorHandler_1.ErrorHandler('File is required', 400));
    const { truckId } = req.params;
    const userId = req.user.userId;
    const truck = await truck_model_1.default.findOne({ _id: truckId, userId });
    if (!truck)
        return next(new ErrorHandler_1.ErrorHandler('Truck not found', 404));
    try {
        const fileData = await (0, gridfs_service_1.uploadFile)(file);
        const updatedTruck = await truck_model_1.default.findByIdAndUpdate(truckId, {
            $push: {
                files: { ...fileData, originalname: file.originalname },
            },
        }, { new: true }).lean();
        if (!updatedTruck)
            return next(new ErrorHandler_1.ErrorHandler('Failed to update truck', 500));
        res.status(200).json((0, response_types_1.SuccessResponse)(updatedTruck, 'File uploaded successfully'));
    }
    catch (error) {
        return next(new ErrorHandler_1.ErrorHandler(`File upload failed: ${error.message}`, 500));
    }
});
exports.getTruckFiles = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { truckId } = req.params;
    const userId = req.user.userId;
    const truck = await truck_model_1.default.findOne({ _id: truckId, userId });
    if (!truck)
        return next(new ErrorHandler_1.ErrorHandler('Truck not found', 404));
    const files = truck.files;
    res.status(200).json((0, response_types_1.SuccessResponse)(files, 'Files fetched successfully'));
});
exports.downloadTruckFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { filename } = req.params;
    const userId = req.user.userId;
    const truck = await truck_model_1.default.findOne({
        userId,
        'files.filename': filename,
    }).lean();
    if (!truck)
        return next(new ErrorHandler_1.ErrorHandler('File not found or access denied', 404));
    const fileData = truck.files.find((file) => file.filename === filename);
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
exports.deleteTruckFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { filename } = req.params;
    const userId = req.user.userId;
    const truck = await truck_model_1.default.findOne({
        userId,
        'files.filename': filename,
    });
    if (!truck)
        return next(new ErrorHandler_1.ErrorHandler('File not found or access denied', 404));
    try {
        await truck_model_1.default.updateOne({ userId }, { $pull: { files: { filename } } });
        await (0, gridfs_service_1.deleteFile)(filename);
        res.status(200).json((0, response_types_1.SuccessResponse)(null, 'File deleted successfully'));
    }
    catch (error) {
        return next(new ErrorHandler_1.ErrorHandler(`File deletion failed: ${error.message}`, 500));
    }
});
