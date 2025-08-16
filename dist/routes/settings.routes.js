"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("../config/multer"));
const settingsController_1 = require("../controllers/settingsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const SettingsRoutes = (0, express_1.Router)();
// Company info routes
SettingsRoutes.get('/company-info', authMiddleware_1.authMiddleware, settingsController_1.getCompanySettings);
SettingsRoutes.put('/company-info', authMiddleware_1.authMiddleware, settingsController_1.updateCompanyInfo);
// Carrier numbers routes
SettingsRoutes.get('/carrier-numbers', authMiddleware_1.authMiddleware, settingsController_1.getCarrierNumbers);
SettingsRoutes.put('/carrier-numbers', authMiddleware_1.authMiddleware, settingsController_1.updateCarrierNumbers);
// File management routes - explicitly set no parsing before multer
SettingsRoutes.post('/carrier-numbers/files', authMiddleware_1.authMiddleware, multer_1.default.single('file'), settingsController_1.uploadCarrierFile);
SettingsRoutes.get('/carrier-numbers/files', authMiddleware_1.authMiddleware, settingsController_1.getCarrierFiles);
SettingsRoutes.get('/carrier-numbers/files/:filename', authMiddleware_1.authMiddleware, settingsController_1.downloadFile);
SettingsRoutes.delete('/carrier-numbers/files/:filename', authMiddleware_1.authMiddleware, settingsController_1.deleteFile);
exports.default = SettingsRoutes;
