"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const orderSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true, ref: 'User' },
    orderNumber: { type: String, unique: true, sparse: true },
    contact: { type: String, required: true },
    permitStartDate: { type: Date, required: true },
    truckId: { type: String, required: true, ref: 'Truck' },
    trailerId: { type: String, required: true, ref: 'Trailer' },
    commodity: { type: String, required: true },
    loadDims: { type: String, required: true },
    lengthFt: { type: Number, required: true },
    lengthIn: { type: Number, required: true },
    widthFt: { type: Number, required: true },
    widthIn: { type: Number, required: true },
    heightFt: { type: Number, required: true },
    heightIn: { type: Number, required: true },
    rearOverhangFt: { type: Number, required: true },
    rearOverhangIn: { type: Number, required: true },
    makeModel: { type: String },
    serial: { type: String },
    singleMultiple: { type: String },
    legalWeight: { type: String, enum: ['yes', 'no'], required: true },
    originAddress: { type: String, required: true },
    destinationAddress: { type: String, required: true },
    orderMessage: { type: String },
    files: [
        {
            filename: { type: String, required: true },
            originalname: { type: String, required: true },
            contentType: { type: String, required: true },
            size: { type: Number, required: true },
        },
    ],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'],
        default: 'pending',
    },
}, {
    timestamps: true,
});
orderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        const Order = this.constructor;
        const count = await Order.countDocuments();
        this.orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});
exports.default = (0, mongoose_1.model)('Order', orderSchema);
