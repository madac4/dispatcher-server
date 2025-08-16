"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const refreshTokenSchema = new mongoose_1.Schema({
    token: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: '7d' } },
    createdAt: { type: Date, default: Date.now },
});
exports.default = (0, mongoose_1.model)('RefreshToken', refreshTokenSchema);
