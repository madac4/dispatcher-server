"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.downloadFile = exports.getCarrierFiles = exports.uploadCarrierFile = exports.updateCarrierNumbers = exports.getCarrierNumbers = exports.updateCompanyInfo = exports.getCompanySettings = void 0;
const settings_model_1 = __importDefault(require("../models/settings.model"));
const gridfs_service_1 = require("../services/gridfs.service");
const auth_types_1 = require("../types/auth.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
const validators_1 = require("../utils/validators");
exports.getCompanySettings = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.userId;
    const settings = await settings_model_1.default.findOne({ userId: userId }).lean();
    if (!settings) {
        res.status(200).json((0, response_types_1.SuccessResponse)({ companyInfo: null }));
        return;
    }
    const companyInfo = settings?.companyInfo;
    res.status(200).json((0, response_types_1.SuccessResponse)(companyInfo, 'Company settings fetched successfully'));
});
exports.updateCompanyInfo = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { name, dba, address, city, state, zip, phone, fax, email } = req.body;
    if (email) {
        if (!(0, validators_1.validateEmail)(email))
            return next(new ErrorHandler_1.ErrorHandler('Invalid email', 400));
    }
    const settings = await settings_model_1.default.findOne({ userId: req.user.userId });
    if (!settings) {
        const newSettings = await settings_model_1.default.create({
            userId: req.user.userId,
            companyInfo: {
                name,
                dba,
                address,
                city,
                state,
                zip,
                phone,
                fax,
                email,
            },
        });
        res.status(201).json((0, response_types_1.SuccessResponse)(newSettings.companyInfo, 'Company information saved'));
        return;
    }
    const updatedCompany = await settings_model_1.default.findOneAndUpdate({ userId: req.user.userId }, {
        $set: {
            companyInfo: {
                name,
                dba,
                address,
                city,
                state,
                zip,
                phone,
                fax,
                email,
            },
        },
    }, { new: true, runValidators: true, upsert: true }).lean();
    if (!updatedCompany)
        return next(new ErrorHandler_1.ErrorHandler('Company information not found', 404));
    res.status(200).json((0, response_types_1.SuccessResponse)(updatedCompany.companyInfo, 'Company information updated'));
});
exports.getCarrierNumbers = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.userId;
    const settings = await settings_model_1.default.findOne({ userId }).lean();
    if (!settings) {
        res.status(200).json((0, response_types_1.SuccessResponse)({ carrierNumbers: null }));
        return;
    }
    res.status(200).json((0, response_types_1.SuccessResponse)(settings.carrierNumbers, 'Carrier numbers fetched'));
});
exports.updateCarrierNumbers = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.userId;
    const { mcNumber, dotNumber, einNumber, iftaNumber, orNumber, kyuNumber, txNumber, tnNumber, laNumber, notes, } = req.body;
    const settings = await settings_model_1.default.findOne({ userId });
    if (!settings) {
        const newSettings = await settings_model_1.default.create({
            userId,
            carrierNumbers: {
                mcNumber,
                dotNumber,
                einNumber,
                iftaNumber,
                orNumber,
                kyuNumber,
                txNumber,
                tnNumber,
                laNumber,
                notes,
                files: [],
            },
        });
        res.status(201).json((0, response_types_1.SuccessResponse)(newSettings.carrierNumbers, 'Carrier numbers saved'));
        return;
    }
    const existingFiles = settings.carrierNumbers?.files || [];
    const updatedSettings = await settings_model_1.default.findOneAndUpdate({ userId }, {
        $set: {
            carrierNumbers: {
                mcNumber,
                dotNumber,
                einNumber,
                iftaNumber,
                orNumber,
                kyuNumber,
                txNumber,
                tnNumber,
                laNumber,
                notes,
                files: existingFiles,
            },
        },
    }, { new: true }).lean();
    if (!updatedSettings)
        return next(new ErrorHandler_1.ErrorHandler('Carrier numbers not found', 404));
    res.status(200).json((0, response_types_1.SuccessResponse)(updatedSettings.carrierNumbers, 'Carrier numbers updated'));
});
exports.uploadCarrierFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const file = req.file;
    if (!file)
        return next(new ErrorHandler_1.ErrorHandler('File is required', 400));
    const userId = req.user.userId;
    const settings = await settings_model_1.default.findOne({ userId });
    if (!settings)
        return next(new ErrorHandler_1.ErrorHandler('Settings not found', 404));
    try {
        const fileData = await (0, gridfs_service_1.uploadFile)(file);
        const updatedSettings = await settings_model_1.default.findOneAndUpdate({ userId }, {
            $push: {
                'carrierNumbers.files': {
                    ...fileData,
                    originalname: file.originalname,
                },
            },
        }, { new: true }).lean();
        if (!updatedSettings)
            return next(new ErrorHandler_1.ErrorHandler('Failed to update settings', 500));
        res.status(200).json((0, response_types_1.SuccessResponse)(null, 'File uploaded successfully'));
    }
    catch (error) {
        return next(new ErrorHandler_1.ErrorHandler(`File upload failed: ${error.message}`, 500));
    }
});
exports.getCarrierFiles = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.userId;
    const settings = await settings_model_1.default.findOne({ userId }).lean();
    if (!settings) {
        res.status(200).json((0, response_types_1.SuccessResponse)({ files: [] }, 'No files found'));
        return;
    }
    const files = settings.carrierNumbers.files;
    res.status(200).json((0, response_types_1.SuccessResponse)(files, 'Files fetched successfully'));
});
exports.downloadFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { filename, userId } = req.params;
    const { id, role } = req.user;
    let settingsQuery = {
        userId: id,
        'carrierNumbers.files.filename': filename,
    };
    if (role === auth_types_1.UserRole.ADMIN || role === auth_types_1.UserRole.MODERATOR) {
        settingsQuery.userId = userId;
    }
    const settings = await settings_model_1.default.findOne(settingsQuery).lean();
    if (!settings)
        return next(new ErrorHandler_1.ErrorHandler('File not found or access denied', 404));
    const fileData = settings.carrierNumbers.files.find(file => file.filename === filename);
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
exports.deleteFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { filename } = req.params;
    const userId = req.user.userId;
    const settings = await settings_model_1.default.findOne({
        userId,
        'carrierNumbers.files.filename': filename,
    });
    if (!settings)
        return next(new ErrorHandler_1.ErrorHandler('File not found or access denied', 404));
    try {
        await settings_model_1.default.updateOne({ userId }, { $pull: { 'carrierNumbers.files': { filename } } });
        await (0, gridfs_service_1.deleteFile)(filename);
        res.status(200).json((0, response_types_1.SuccessResponse)(null, 'File deleted successfully'));
    }
    catch (error) {
        return next(new ErrorHandler_1.ErrorHandler(`File deletion failed: ${error.message}`, 500));
    }
});
