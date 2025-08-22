"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileExists = exports.deleteFile = exports.getFile = exports.uploadFile = exports.initGridFS = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const stream_1 = require("stream");
let bucket = null;
// Initialize the GridFS bucket
const initGridFS = () => {
    if (!mongoose_1.default.connection.db) {
        throw new Error('Database connection not established');
    }
    try {
        bucket = new mongoose_1.default.mongo.GridFSBucket(mongoose_1.default.connection.db, {
            bucketName: 'uploads',
        });
        console.log('GridFS initialized');
    }
    catch (error) {
        console.error('Failed to initialize GridFS:', error);
        throw error;
    }
};
exports.initGridFS = initGridFS;
const uploadFile = async (file) => {
    if (!bucket) {
        (0, exports.initGridFS)();
    }
    if (!bucket) {
        throw new Error('GridFS not initialized');
    }
    return new Promise((resolve, reject) => {
        try {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const filename = uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_');
            console.log('Creating readable stream from buffer', {
                bufferExists: !!file.buffer,
                bufferLength: file.buffer ? file.buffer.length : 0,
            });
            const readableStream = new stream_1.Readable({
                read() {
                    this.push(file.buffer);
                    this.push(null);
                },
            });
            const uploadStream = bucket.openUploadStream(filename, {
                contentType: file.mimetype,
                metadata: {
                    originalname: file.originalname,
                    encoding: file.encoding,
                    mimetype: file.mimetype,
                    size: file.size,
                },
            });
            uploadStream.on('finish', function () {
                console.log('GridFS upload finished successfully');
                resolve({
                    id: uploadStream.id.toString(),
                    filename: filename,
                    contentType: file.mimetype,
                    size: file.size,
                });
            });
            uploadStream.on('error', function (error) {
                console.error('GridFS upload error:', error);
                reject(error);
            });
            readableStream.pipe(uploadStream);
        }
        catch (error) {
            console.error('Error in uploadFile:', error);
            reject(error);
        }
    });
};
exports.uploadFile = uploadFile;
// Get a file from GridFS
const getFile = async (filename) => {
    if (!bucket) {
        (0, exports.initGridFS)();
    }
    if (!bucket) {
        throw new Error('GridFS not initialized');
    }
    try {
        return bucket.openDownloadStreamByName(filename);
    }
    catch (error) {
        console.error(`Error getting file ${filename}:`, error);
        throw new Error(`File not found: ${filename}`);
    }
};
exports.getFile = getFile;
// Delete a file from GridFS
const deleteFile = async (filename) => {
    if (!bucket || !mongoose_1.default.connection.db) {
        (0, exports.initGridFS)();
    }
    if (!bucket || !mongoose_1.default.connection.db) {
        throw new Error('GridFS not initialized');
    }
    try {
        // Find the file by filename
        const files = await mongoose_1.default.connection.db.collection('uploads.files').find({ filename }).toArray();
        if (files.length === 0) {
            throw new Error(`File not found: ${filename}`);
        }
        // Delete the file
        await bucket.delete(files[0]._id);
    }
    catch (error) {
        console.error(`Error deleting file ${filename}:`, error);
        throw error;
    }
};
exports.deleteFile = deleteFile;
// Check if a file exists
const fileExists = async (filename) => {
    if (!mongoose_1.default.connection.db) {
        return false;
    }
    try {
        const files = await mongoose_1.default.connection.db.collection('uploads.files').find({ filename }).toArray();
        return files.length > 0;
    }
    catch (error) {
        console.error(`Error checking if file ${filename} exists:`, error);
        return false;
    }
};
exports.fileExists = fileExists;
