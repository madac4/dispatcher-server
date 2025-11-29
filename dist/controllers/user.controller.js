"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsersWithSettings = exports.getUsers = void 0;
const settings_model_1 = __importDefault(require("../models/settings.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const auth_types_1 = require("../types/auth.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
exports.getUsers = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const users = await user_model_1.default.find({ role: auth_types_1.UserRole.USER });
    res.status(200).json((0, response_types_1.SuccessResponse)(users, 'Users fetched successfully'));
});
exports.getAllUsersWithSettings = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const query = req.query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const roleFilter = query.role;
    const search = query.search || '';
    // Build filter
    const filter = {
        role: { $in: [auth_types_1.UserRole.USER, auth_types_1.UserRole.MODERATOR] },
    };
    // Apply role filter if specified
    if (roleFilter &&
        (roleFilter === auth_types_1.UserRole.USER || roleFilter === auth_types_1.UserRole.MODERATOR)) {
        filter.role = roleFilter;
    }
    // Apply search filter if provided
    if (search) {
        filter.$or = [{ email: { $regex: search, $options: 'i' } }];
    }
    // Get total count
    const total = await user_model_1.default.countDocuments(filter);
    // Fetch users and moderators with pagination
    const skip = (page - 1) * limit;
    const users = await user_model_1.default.find(filter)
        .select('_id email role isEmailConfirmed createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    // Fetch settings for all users
    const userIds = users.map(user => user._id.toString());
    const settingsMap = new Map();
    if (userIds.length > 0) {
        const settings = await settings_model_1.default.find({
            userId: { $in: userIds },
        })
            .select('userId companyInfo')
            .lean();
        settings.forEach(setting => {
            settingsMap.set(setting.userId, setting.companyInfo);
        });
    }
    // Combine user data with settings
    const usersWithSettings = users.map(user => {
        const userId = user._id.toString();
        const companyInfo = settingsMap.get(userId) || null;
        return {
            id: userId,
            email: user.email,
            role: user.role,
            isEmailConfirmed: user.isEmailConfirmed,
            createdAt: user.createdAt,
            companyInfo: companyInfo
                ? {
                    name: companyInfo.name || null,
                    phone: companyInfo.phone || null,
                    email: companyInfo.email || null,
                }
                : null,
        };
    });
    // Separate users and moderators
    const regularUsers = usersWithSettings.filter(user => user.role === auth_types_1.UserRole.USER);
    const moderators = usersWithSettings.filter(user => user.role === auth_types_1.UserRole.MODERATOR);
    // Create pagination meta
    const meta = (0, response_types_1.CreatePaginationMeta)(total, page, limit);
    // Return as paginated response with the object wrapped
    res.status(200).json({
        status: 200,
        success: true,
        message: 'Users and moderators fetched successfully',
        data: {
            users: regularUsers,
            moderators: moderators,
        },
        meta,
    });
});
