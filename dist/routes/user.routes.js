"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rolesMiddleware_1 = require("../middleware/rolesMiddleware");
const auth_types_1 = require("../types/auth.types");
const router = (0, express_1.Router)();
// Get all users and moderators with settings (admin only)
router.get('/all', authMiddleware_1.authMiddleware, (0, rolesMiddleware_1.rolesMiddleware)([auth_types_1.UserRole.ADMIN]), user_controller_1.getAllUsersWithSettings);
// Get regular users only (existing endpoint)
router.get('/', authMiddleware_1.authMiddleware, user_controller_1.getUsers);
exports.default = router;
