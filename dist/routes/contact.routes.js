"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contact_controller_1 = require("../controllers/contact.controller");
const ContactRoutes = (0, express_1.Router)();
ContactRoutes.post('/send', contact_controller_1.sendContactForm);
exports.default = ContactRoutes;
