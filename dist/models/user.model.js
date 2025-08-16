"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = require("mongoose");
const auth_types_1 = require("../types/auth.types");
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
        lowercase: true,
        validate: {
            validator: function (email) {
                return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email);
            },
            message: (props) => `${props.value} is not a valid email`,
        },
    },
    password: {
        type: String,
        select: false,
        required: [true, 'Password is required'],
        validate: [
            {
                validator: function (password) {
                    return password.length >= 8;
                },
                message: 'Password must be at least 8 characters long',
            },
            {
                validator: function (password) {
                    return /[A-Z]/.test(password);
                },
                message: 'Password must contain at least one uppercase letter',
            },
            {
                validator: function (password) {
                    return /[a-z]/.test(password);
                },
                message: 'Password must contain at least one lowercase letter',
            },
            {
                validator: function (password) {
                    return /\d/.test(password);
                },
                message: 'Password must contain at least one number',
            },
            {
                validator: function (password) {
                    return /[@$!%*?&]/.test(password);
                },
                message: 'Password must contain at least one special character (@$!%*?&)',
            },
        ],
    },
    role: {
        type: String,
        enum: auth_types_1.UserRole,
        default: auth_types_1.UserRole.USER,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    settingsId: { type: String, ref: 'UserSettings' },
});
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        next();
    this.password = await bcrypt_1.default.hash(this.password, 10);
});
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt_1.default.compare(enteredPassword, this.password);
};
userSchema.methods.signAccessToken = function () {
    return jsonwebtoken_1.default.sign({ userId: this._id, role: this.role }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });
};
userSchema.methods.signRefreshToken = function () {
    return jsonwebtoken_1.default.sign({ userId: this._id, role: this.role }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};
exports.default = (0, mongoose_1.model)('User', userSchema);
