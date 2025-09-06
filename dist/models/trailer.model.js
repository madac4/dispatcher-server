"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const trailerSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true, ref: 'User' },
    year: { type: Number, required: true },
    make: { type: String, required: true },
    vin: { type: String, required: true },
    licencePlate: { type: String, required: true },
    state: { type: String, required: true },
    nrOfAxles: { type: Number, required: true },
    length: { type: String },
    type: { type: String, required: true },
    unitNumber: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    files: [
        {
            filename: { type: String, required: true },
            originalname: { type: String, required: true },
            contentType: { type: String, required: true },
            size: { type: Number, required: true },
        },
    ],
});
exports.default = (0, mongoose_1.model)('Trailer', trailerSchema);
