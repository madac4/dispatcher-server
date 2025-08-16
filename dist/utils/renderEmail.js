"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ejs_1 = __importDefault(require("ejs"));
const juice_1 = __importDefault(require("juice"));
const path_1 = __importDefault(require("path"));
const renderEmail = async (templateName, data) => {
    const templatePath = path_1.default.join(__dirname, '..', 'views', `${templateName}.ejs`);
    const html = await ejs_1.default.renderFile(templatePath, data);
    const inlinedHtml = (0, juice_1.default)(html);
    return inlinedHtml;
};
exports.default = renderEmail;
