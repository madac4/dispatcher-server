"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("../config/multer"));
const trailerController_1 = require("../controllers/trailerController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const TrailerRoutes = (0, express_1.Router)();
TrailerRoutes.get('/paginated', authMiddleware_1.authMiddleware, trailerController_1.paginatedTrailers);
TrailerRoutes.delete('/:trailerId', authMiddleware_1.authMiddleware, trailerController_1.deleteTrailer);
TrailerRoutes.put('/:trailerId', authMiddleware_1.authMiddleware, trailerController_1.updateTrailer);
TrailerRoutes.get('/:trailerId', authMiddleware_1.authMiddleware, trailerController_1.getTrailer);
TrailerRoutes.post('/', authMiddleware_1.authMiddleware, trailerController_1.createTrailer);
// File management routes - explicitly set no parsing before multer
TrailerRoutes.post('/:trailerId/files', authMiddleware_1.authMiddleware, multer_1.default.single('file'), trailerController_1.uploadTrailerFile);
TrailerRoutes.get('/:trailerId/files', authMiddleware_1.authMiddleware, trailerController_1.getTrailerFiles);
TrailerRoutes.get('/:trailerId/files/:filename', authMiddleware_1.authMiddleware, trailerController_1.downloadTrailerFile);
TrailerRoutes.delete('/:trailerId/files/:filename', authMiddleware_1.authMiddleware, trailerController_1.deleteTrailerFile);
exports.default = TrailerRoutes;
