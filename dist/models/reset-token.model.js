"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const resetTokenSchema = new mongoose_1.Schema({
    token: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: '1h' } },
    createdAt: { type: Date, default: Date.now },
});
exports.default = (0, mongoose_1.model)('ResetToken', resetTokenSchema);
