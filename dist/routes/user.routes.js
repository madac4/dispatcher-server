"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const UserRoutes = (0, express_1.Router)();
UserRoutes.post('/change-password', authMiddleware_1.authMiddleware, userController_1.changePassword);
exports.default = UserRoutes;
