"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = exports.validateEmail = void 0;
const validateEmail = (email) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    return (/[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(password) &&
        password.length >= 8);
};
exports.validatePassword = validatePassword;
