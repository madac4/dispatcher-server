"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
// Use memory storage for GridFS
const storage = multer_1.default.memoryStorage();
// File filter to accept all file types
const fileFilter = (req, file, cb) => {
    // Accept all file types including PDFs, images, etc.
    cb(null, true);
};
// Configure multer with appropriate limits
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1, // Allow only 1 file per request
    },
});
exports.default = upload;
