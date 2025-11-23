"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = require("mongoose");
const invoiceChargeSchema = new mongoose_1.Schema({
    state: { type: String, required: true, trim: true },
    oversize: { type: Number, required: true, default: 0 },
    overweight: { type: Number, required: true, default: 0 },
    superload: { type: Number, required: true, default: 0 },
    serviceFee: { type: Number, required: true, default: 0 },
    escort: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
});
const invoiceOrderSchema = new mongoose_1.Schema({
    orderNumber: { type: String, required: true },
    contact: { type: String, required: true },
    permitStartDate: { type: Date, required: true },
    truckNumber: { type: String, required: true },
    trailerNumber: { type: String, required: true },
    commodity: { type: String, required: true },
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
    legalWeight: { type: String, required: true },
    originAddress: { type: String, required: true },
    destinationAddress: { type: String, required: true },
});
const invoiceSchema = new mongoose_1.Schema({
    invoiceNumber: {
        type: String,
        required: false,
        unique: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    companyInfo: {
        name: { type: String, required: true, trim: true },
        dba: { type: String, trim: true },
        address: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        zip: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        fax: { type: String, trim: true },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    orders: [invoiceOrderSchema],
    charges: [invoiceChargeSchema],
    totalAmount: {
        type: Number,
        required: true,
        default: 0,
    },
    createdBy: {
        type: String,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});
invoiceSchema.pre('save', async function (next) {
    if (this.isNew) {
        if (!this.invoiceNumber) {
            const Invoice = this.constructor;
            let attempts = 0;
            const maxAttempts = 10;
            while (attempts < maxAttempts) {
                const randomNumber = crypto_1.default.randomInt(100000, 999999);
                const invoiceNumber = `INV-${randomNumber}`;
                const existingInvoice = await Invoice.findOne({ invoiceNumber });
                if (!existingInvoice) {
                    this.invoiceNumber = invoiceNumber;
                    break;
                }
                attempts++;
            }
            if (attempts >= maxAttempts) {
                return next(new Error('Unable to generate unique order number after maximum attempts'));
            }
        }
    }
    if (this.charges && this.charges.length > 0) {
        this.totalAmount = this.charges.reduce((sum, charge) => sum + (charge.total || 0), 0);
    }
    next();
});
exports.default = (0, mongoose_1.model)('Invoice', invoiceSchema);
