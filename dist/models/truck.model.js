"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const truckSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true, ref: 'User' },
    year: { type: Number },
    make: { type: String },
    vin: { type: String, required: true, unique: true },
    licencePlate: { type: String, required: true },
    state: { type: String },
    nrOfAxles: { type: Number },
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
exports.default = (0, mongoose_1.model)('Truck', truckSchema);
