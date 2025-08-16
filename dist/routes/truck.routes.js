"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("../config/multer"));
const trucksController_1 = require("../controllers/trucksController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const TruckRoutes = (0, express_1.Router)();
TruckRoutes.get('/paginated', authMiddleware_1.authMiddleware, trucksController_1.paginatedTrucks);
TruckRoutes.delete('/:truckId', authMiddleware_1.authMiddleware, trucksController_1.deleteTruck);
TruckRoutes.put('/:truckId', authMiddleware_1.authMiddleware, trucksController_1.updateTruck);
TruckRoutes.post('/', authMiddleware_1.authMiddleware, trucksController_1.createTruck);
TruckRoutes.get('/:truckId', authMiddleware_1.authMiddleware, trucksController_1.getTruck);
// File management routes - explicitly set no parsing before multer
TruckRoutes.post('/:truckId/files', authMiddleware_1.authMiddleware, multer_1.default.single('file'), trucksController_1.uploadTruckFile);
TruckRoutes.get('/:truckId/files', authMiddleware_1.authMiddleware, trucksController_1.getTruckFiles);
TruckRoutes.get('/:truckId/files/:filename', authMiddleware_1.authMiddleware, trucksController_1.downloadTruckFile);
TruckRoutes.delete('/:truckId/files/:filename', authMiddleware_1.authMiddleware, trucksController_1.deleteTruckFile);
exports.default = TruckRoutes;
