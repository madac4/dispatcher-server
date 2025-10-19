"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.deleteOrderFile = exports.getOrderFiles = exports.uploadOrderFile = exports.downloadOrderFile = exports.getOrderByNumber = exports.getStatuses = exports.getOrders = exports.duplicateOrder = exports.moderateOrder = exports.createOrder = void 0;
const order_dto_1 = require("../dto/order.dto");
const order_model_1 = __importDefault(require("../models/order.model"));
const settings_model_1 = __importDefault(require("../models/settings.model"));
const chat_service_1 = require("../services/chat.service");
const gridfs_service_1 = require("../services/gridfs.service");
const notification_service_1 = require("../services/notification.service");
const socket_service_1 = require("../services/socket.service");
const auth_types_1 = require("../types/auth.types");
const order_types_1 = require("../types/order.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
exports.createOrder = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.id;
    const settings = await settings_model_1.default.findOne({ userId });
    if (!settings ||
        !settings.carrierNumbers?.mcNumber ||
        !settings.carrierNumbers?.dotNumber ||
        !settings.carrierNumbers?.einNumber) {
        return next(new ErrorHandler_1.ErrorHandler('Please complete your company information and carrier numbers in settings', 404));
    }
    const orderData = req.body;
    const files = req.files;
    const requiredFields = [
        'contact',
        'permitStartDate',
        'truckId',
        'trailerId',
        'commodity',
        'loadDims',
        'lengthFt',
        'lengthIn',
        'widthFt',
        'widthIn',
        'heightFt',
        'heightIn',
        'rearOverhangFt',
        'rearOverhangIn',
        'legalWeight',
        'originAddress',
        'destinationAddress',
    ];
    for (const field of requiredFields) {
        if (!orderData[field])
            return next(new ErrorHandler_1.ErrorHandler(`Missing required field: ${field}`, 400));
    }
    const newOrder = new order_model_1.default({
        userId,
        contact: orderData.contact,
        permitStartDate: new Date(orderData.permitStartDate),
        truckId: orderData.truckId,
        trailerId: orderData.trailerId,
        commodity: orderData.commodity,
        loadDims: orderData.loadDims,
        lengthFt: orderData.lengthFt,
        lengthIn: orderData.lengthIn,
        widthFt: orderData.widthFt,
        widthIn: orderData.widthIn,
        heightFt: orderData.heightFt,
        heightIn: orderData.heightIn,
        rearOverhangFt: orderData.rearOverhangFt,
        rearOverhangIn: orderData.rearOverhangIn,
        makeModel: orderData.makeModel || '',
        serial: orderData.serial || '',
        singleMultiple: orderData.singleMultiple || '',
        legalWeight: orderData.legalWeight,
        originAddress: orderData.originAddress,
        destinationAddress: orderData.destinationAddress,
        stops: typeof orderData.stops === 'string'
            ? JSON.parse(orderData.stops)
            : orderData.stops || [],
        files: [],
        status: 'pending',
        axleConfigs: typeof orderData.axleConfigs === 'string'
            ? JSON.parse(orderData.axleConfigs)
            : orderData.axleConfigs || [],
    });
    const savedOrder = await newOrder.save();
    if (!savedOrder) {
        return next(new ErrorHandler_1.ErrorHandler('Failed to create order', 500));
    }
    if (files && files.length > 0) {
        const uploadedFiles = [];
        for (const file of files) {
            try {
                const fileData = await (0, gridfs_service_1.uploadFile)(file);
                uploadedFiles.push({
                    ...fileData,
                    originalname: file.originalname,
                });
            }
            catch (error) {
                console.error('Error uploading file:', error);
            }
        }
        if (uploadedFiles.length > 0) {
            await order_model_1.default.findByIdAndUpdate(savedOrder._id, { $push: { files: { $each: uploadedFiles } } }, { new: true });
        }
    }
    await chat_service_1.ChatService.sendSystemMessage(savedOrder._id.toString(), `New order #${savedOrder.orderNumber} has been created. Status: ${(0, order_types_1.formatStatus)(savedOrder.status)}`, 'system');
    await notification_service_1.notificationService.notifyOrderCreated(savedOrder._id.toString(), savedOrder.orderNumber, userId);
    if (orderData.messages) {
        const messages = (typeof orderData.messages === 'string'
            ? JSON.parse(orderData.messages)
            : orderData.messages);
        messages.forEach(async (message) => {
            await chat_service_1.ChatService.sendUserMessage(savedOrder._id, message, userId);
        });
    }
    socket_service_1.socketService.broadcastOrderUpdate(savedOrder._id.toString(), {
        type: 'order_created',
        order: savedOrder,
    });
    res.status(201).json((0, response_types_1.SuccessResponse)({}, 'Order created successfully'));
});
exports.moderateOrder = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.id;
    const { orderId } = req.params;
    const order = await order_model_1.default.findById(orderId);
    if (!order)
        return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
    order.moderatorId = userId;
    order.status = order_types_1.OrderStatus.PROCESSING;
    await order.save();
    const userSettings = await settings_model_1.default.findOne({ userId: order.userId });
    if (!userSettings)
        return next(new ErrorHandler_1.ErrorHandler('User settings not found', 404));
    const orderDTO = new order_dto_1.ModeratorOrderDTO(order, userSettings);
    await notification_service_1.notificationService.notifyOrderModerated(orderId, userId);
    res.status(200).json((0, response_types_1.SuccessResponse)(orderDTO, 'Order moderated successfully'));
});
exports.duplicateOrder = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.userId;
    const { orderId } = req.params;
    if (!userId)
        return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
    const order = await order_model_1.default.findById(orderId);
    if (!order)
        return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
    const newOrder = await order_model_1.default.create({
        ...order,
        userId,
    });
    res.status(201).json((0, response_types_1.SuccessResponse)(new order_dto_1.OrderDTO(newOrder), 'Order duplicated successfully'));
});
exports.getOrders = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { page, limit, search } = req.query;
    const statuses = req.query['status[]'] || [];
    const skip = (page - 1) * limit;
    let query = {
        status: { $in: statuses || [] },
        $or: [
            { orderNumber: { $regex: search, $options: 'i' } },
            { 'truckId.unitNumber': { $regex: search, $options: 'i' } },
            { destinationAddress: { $regex: search, $options: 'i' } },
            { originAddress: { $regex: search, $options: 'i' } },
        ],
    };
    if (userRole === auth_types_1.UserRole.USER) {
        query.userId = userId;
    }
    const orders = await order_model_1.default.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('truckId', 'unitNumber year make licencePlate state')
        .populate('trailerId', 'unitNumber year make licencePlate state')
        .populate('userId', 'email')
        .lean();
    const totalItems = await order_model_1.default.countDocuments(query);
    const orderDtos = orders.map(order => new order_dto_1.PaginatedOrderDTO(order));
    const meta = (0, response_types_1.CreatePaginationMeta)(totalItems, page, limit);
    res.status(200).json((0, response_types_1.PaginatedResponse)(orderDtos, meta));
});
exports.getStatuses = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res) => {
    const { type } = req.params;
    const user = req.user;
    let statuses = [];
    switch (type) {
        case order_types_1.OrderStatusType.ACTIVE:
            statuses = [order_types_1.OrderStatus.PENDING, order_types_1.OrderStatus.PROCESSING];
            break;
        case order_types_1.OrderStatusType.COMPLETED:
            statuses = [
                order_types_1.OrderStatus.REQUIRES_INVOICE,
                order_types_1.OrderStatus.REQUIRES_CHARGE,
            ];
            break;
        case order_types_1.OrderStatusType.PAID:
            statuses = [order_types_1.OrderStatus.CHARGED];
            break;
        case order_types_1.OrderStatusType.ARCHIVED:
            statuses = [order_types_1.OrderStatus.FINISHED, order_types_1.OrderStatus.CANCELLED];
            break;
        default:
            statuses = Object.values(order_types_1.OrderStatus);
            break;
    }
    const response = await Promise.all([
        {
            value: 'all',
            label: 'All Statuses',
            quantity: await order_model_1.default.countDocuments({
                [user.role === auth_types_1.UserRole.USER ? 'userId' : '']: user.role === auth_types_1.UserRole.USER ? user.userId : null,
                status: { $in: statuses },
            }),
        },
        ...statuses.map(async (status) => {
            const count = await order_model_1.default.countDocuments({
                [user.role === auth_types_1.UserRole.USER ? 'userId' : '']: user.role === auth_types_1.UserRole.USER ? user.userId : null,
                status: status,
            });
            return {
                value: status,
                label: (0, order_types_1.formatStatus)(status),
                quantity: count,
            };
        }),
    ]);
    res.status(200).json((0, response_types_1.SuccessResponse)(response, 'Statuses retrieved successfully'));
});
exports.getOrderByNumber = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { orderNumber } = req.params;
    const user = req.user;
    if (!orderNumber)
        return next(new ErrorHandler_1.ErrorHandler('Order number is required', 400));
    let query = { orderNumber };
    if (user.role === auth_types_1.UserRole.USER) {
        query.userId = user.id;
    }
    const order = await order_model_1.default.findOne(query)
        .populate('truckId')
        .populate('trailerId')
        .populate('moderatorId');
    if (!order)
        return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
    if (user.role !== auth_types_1.UserRole.USER) {
        const userSettings = await settings_model_1.default.findOne({
            userId: order.userId,
        });
        if (!userSettings)
            return next(new ErrorHandler_1.ErrorHandler('User settings not found', 404));
        const orderDTO = new order_dto_1.ModeratorOrderDTO(order, userSettings);
        return res
            .status(200)
            .json((0, response_types_1.SuccessResponse)(orderDTO, 'Order retrieved successfully'));
    }
    const orderDTO = new order_dto_1.OrderDTO(order);
    res.status(200).json((0, response_types_1.SuccessResponse)(orderDTO, 'Order retrieved successfully'));
});
exports.downloadOrderFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { id, role } = req.user;
    const { filename, orderId } = req.params;
    let orderQuery = {
        _id: orderId,
        userId: id,
        'files.filename': filename,
    };
    if (role === auth_types_1.UserRole.MODERATOR || role === auth_types_1.UserRole.ADMIN) {
        delete orderQuery.userId;
    }
    const order = await order_model_1.default.findOne(orderQuery).lean();
    if (!order)
        return next(new ErrorHandler_1.ErrorHandler('File not found or access denied', 404));
    const fileData = order.files.find((file) => file.filename === filename);
    if (!fileData)
        return next(new ErrorHandler_1.ErrorHandler('File metadata not found', 404));
    const exists = await (0, gridfs_service_1.fileExists)(filename);
    if (!exists) {
        return next(new ErrorHandler_1.ErrorHandler('File not found in storage', 404));
    }
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.originalname}"`);
    res.setHeader('Content-Type', fileData.contentType);
    const fileStream = await (0, gridfs_service_1.getFile)(filename);
    fileStream.pipe(res);
});
exports.uploadOrderFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const file = req.file;
    const user = req.user;
    if (!file)
        return next(new ErrorHandler_1.ErrorHandler('File is required', 400));
    const { orderId } = req.params;
    const query = user.role === auth_types_1.UserRole.USER
        ? { _id: orderId, userId: user.userId }
        : { _id: orderId };
    const order = await order_model_1.default.findOne(query);
    if (!order)
        return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
    const fileData = await (0, gridfs_service_1.uploadFile)(file);
    const updatedOrder = await order_model_1.default.findByIdAndUpdate(orderId, {
        $push: {
            files: { ...fileData, originalname: file.originalname },
        },
    }, { new: true }).lean();
    console.log(updatedOrder);
    if (!updatedOrder)
        return next(new ErrorHandler_1.ErrorHandler('Failed to update order', 500));
    await notification_service_1.notificationService.notifyOrderFileUploaded(orderId, user.id, user.email, file.originalname);
    res.status(200).json((0, response_types_1.SuccessResponse)(updatedOrder, 'File uploaded successfully'));
});
exports.getOrderFiles = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const order = await order_model_1.default.findOne({ _id: orderId, userId });
    if (!order)
        return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
    const files = order.files;
    res.status(200).json((0, response_types_1.SuccessResponse)(files, 'Files fetched successfully'));
});
exports.deleteOrderFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { filename, orderId } = req.params;
    const userId = req.user.userId;
    const order = await order_model_1.default.findOne({
        userId,
        _id: orderId,
        'files.filename': filename,
    });
    if (!order)
        return next(new ErrorHandler_1.ErrorHandler('File not found or access denied', 404));
    await order_model_1.default.updateOne({ userId }, { $pull: { files: { filename } } });
    await (0, gridfs_service_1.deleteFile)(filename);
    res.status(200).json((0, response_types_1.SuccessResponse)(null, 'File deleted successfully'));
});
exports.updateOrderStatus = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const order = await order_model_1.default.findById(orderId);
    if (!order)
        return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
    order.status = status;
    await order.save();
    socket_service_1.socketService.broadcastOrderUpdate(orderId, {
        type: 'order_status_updated',
        order: order,
    });
    await chat_service_1.ChatService.sendSystemMessage(orderId, `Order #${order.orderNumber} status has been updated to ${(0, order_types_1.formatStatus)(status)}`, 'system');
    res.status(200).json((0, response_types_1.SuccessResponse)(order, `Order status updated successfully to ${(0, order_types_1.formatStatus)(status)}`));
});
