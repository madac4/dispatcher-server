"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const TeamSchema = new mongoose_1.Schema({
    owner: {
        type: String,
        ref: 'User',
        required: true,
        index: true,
    },
    members: [
        {
            type: String,
            ref: 'User',
            index: true,
        },
    ],
    name: {
        type: String,
        trim: true,
        maxlength: 50,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
const Team = (0, mongoose_1.model)('Team', TeamSchema);
exports.default = Team;
