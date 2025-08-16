"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const auth_types_1 = require("../types/auth.types");
const invitationSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: auth_types_1.UserRole,
        default: auth_types_1.UserRole.USER,
    },
    invitedBy: {
        type: String,
        ref: 'User',
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: {
            expires: '7d',
        },
    },
    teamId: {
        type: String,
        ref: 'Team',
        required: true,
    },
    used: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
exports.default = (0, mongoose_1.model)('Invitation', invitationSchema);
