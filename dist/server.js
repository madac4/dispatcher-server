"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const db_1 = __importDefault(require("./config/db"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const invitation_routes_1 = __importDefault(require("./routes/invitation.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const trailer_routes_1 = __importDefault(require("./routes/trailer.routes"));
const truck_routes_1 = __importDefault(require("./routes/truck.routes"));
const gridfs_service_1 = require("./services/gridfs.service");
const socket_service_1 = require("./services/socket.service");
const ErrorHandler_1 = require("./utils/ErrorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const port = parseInt(process.env.PORT || '3000', 10);
(0, db_1.default)().then(() => {
    (0, gridfs_service_1.initGridFS)();
});
socket_service_1.socketService.initialize(server);
app.use((0, cors_1.default)({
    credentials: true,
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (process.env.FRONTEND_ORIGINS) {
            if (process.env.FRONTEND_ORIGINS.indexOf(origin) === -1) {
                const msg = `This site ${origin} does not have an access. Only specific domains are allowed to access it.`;
                return callback(new Error(msg), false);
            }
        }
        return callback(null, true);
    },
}));
app.use(body_parser_1.default.urlencoded({ limit: '50mb', extended: true }));
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});
const jsonParser = body_parser_1.default.json({ limit: '50mb' });
app.use('/api/authorization', jsonParser, auth_routes_1.default);
app.use('/api/invitation', jsonParser, invitation_routes_1.default);
app.use('/api/trailers', jsonParser, trailer_routes_1.default);
app.use('/api/trucks', jsonParser, truck_routes_1.default);
app.use('/api/orders', jsonParser, order_routes_1.default);
app.use('/api/chat', jsonParser, chat_routes_1.default);
app.use('/api/settings', (req, res, next) => {
    if (req.path.includes('/files') &&
        (req.method === 'POST' || req.method === 'PUT')) {
        return next();
    }
    return jsonParser(req, res, next);
}, settings_routes_1.default);
app.use(ErrorHandler_1.globalErrorHandler);
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
