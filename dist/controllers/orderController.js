"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrderFile = exports.getOrderFiles = exports.uploadOrderFile = exports.downloadOrderFile = exports.getOrderByNumber = exports.getStatuses = exports.getOrders = exports.duplicateOrder = exports.createOrder = void 0;
const order_dto_1 = require("../dto/order.dto");
const order_model_1 = __importDefault(require("../models/order.model"));
const chat_service_1 = require("../services/chat.service");
const gridfs_service_1 = require("../services/gridfs.service");
const socket_service_1 = require("../services/socket.service");
const order_types_1 = require("../types/order.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
const createOrder = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        if (!userId)
            return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
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
        await chat_service_1.ChatService.sendSystemMessage(savedOrder._id.toString(), `New order #${savedOrder.orderNumber} has been created. Status: ${savedOrder.status}`, 'system');
        socket_service_1.socketService.broadcastOrderUpdate(savedOrder._id.toString(), {
            type: 'order_created',
            order: savedOrder,
        });
        res.status(201).json((0, response_types_1.SuccessResponse)({}, 'Order created successfully'));
    }
    catch (error) {
        console.error('Error creating order:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while creating order', 500));
    }
};
exports.createOrder = createOrder;
exports.duplicateOrder = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.userId;
    if (!userId)
        return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
    const { orderId } = req.params;
    const order = await order_model_1.default.findById(orderId);
    if (!order)
        return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
    const newOrder = await order_model_1.default.create({
        ...order,
        userId,
    });
    res.status(201).json((0, response_types_1.SuccessResponse)(new order_dto_1.OrderDTO(newOrder), 'Order duplicated successfully'));
});
const getOrders = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { page, limit, search } = req.query;
        const statuses = req.query['status[]'] || [];
        const skip = (page - 1) * limit;
        const query = {
            userId,
            status: { $in: statuses || [] },
            $or: [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'truckId.unitNumber': { $regex: search, $options: 'i' } },
                { destinationAddress: { $regex: search, $options: 'i' } },
                { originAddress: { $regex: search, $options: 'i' } },
            ],
        };
        const orders = await order_model_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('truckId', 'unitNumber year make licencePlate state')
            .populate('trailerId', 'unitNumber year make licencePlate state')
            .lean();
        const totalItems = await order_model_1.default.countDocuments(query);
        const orderDtos = orders.map(order => new order_dto_1.PaginatedOrderDTO(order));
        const meta = (0, response_types_1.CreatePaginationMeta)(totalItems, page, limit);
        res.status(200).json((0, response_types_1.PaginatedResponse)(orderDtos, meta));
    }
    catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving orders',
        });
    }
};
exports.getOrders = getOrders;
const getStatuses = async (req, res, next) => {
    try {
        const { type } = req.params;
        let statuses = [];
        if (type === 'active') {
            statuses = [
                order_types_1.OrderStatus.ACTIVE,
                order_types_1.OrderStatus.PENDING,
                order_types_1.OrderStatus.PROCESSING,
            ];
        }
        else if (type === 'completed') {
            statuses = [
                order_types_1.OrderStatus.REQUIRES_INVOICE,
                order_types_1.OrderStatus.REQUIRES_CHARGE,
            ];
        }
        else if (type === 'paid') {
            statuses = [order_types_1.OrderStatus.CHARGED];
        }
        else if (type === 'archived') {
            statuses = [order_types_1.OrderStatus.COMPLETED, order_types_1.OrderStatus.CANCELLED];
        }
        else {
            statuses = Object.values(order_types_1.OrderStatus);
        }
        const response = await Promise.all([
            {
                value: 'all',
                label: 'All Statuses',
                quantity: await order_model_1.default.countDocuments({
                    userId: req.user.userId,
                    status: { $in: statuses },
                }),
            },
            ...statuses.map(async (status) => {
                const count = await order_model_1.default.countDocuments({
                    userId: req.user.userId,
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
    }
    catch (error) {
        console.error('Error getting statuses:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving statuses',
        });
    }
};
exports.getStatuses = getStatuses;
const getOrderByNumber = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { orderNumber } = req.params;
        if (!orderNumber)
            return next(new ErrorHandler_1.ErrorHandler('Order number is required', 400));
        const order = await order_model_1.default.findOne({ orderNumber })
            .populate('truckId')
            .populate('trailerId');
        if (!order)
            return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
        const orderDTO = new order_dto_1.OrderDTO(order);
        console.log(orderDTO);
        res.status(200).json((0, response_types_1.SuccessResponse)(orderDTO, 'Order retrieved successfully'));
    }
    catch (error) {
        console.error('Error getting order by number:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while retrieving order', 500));
    }
};
exports.getOrderByNumber = getOrderByNumber;
exports.downloadOrderFile = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { filename, orderId } = req.params;
    const userId = req.user.userId;
    const order = await order_model_1.default.findOne({
        userId,
        _id: orderId,
        'files.filename': filename,
    }).lean();
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
const uploadOrderFile = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file)
            return next(new ErrorHandler_1.ErrorHandler('File is required', 400));
        const { orderId } = req.params;
        const userId = req.user.userId;
        const order = await order_model_1.default.findOne({ _id: orderId, userId });
        if (!order)
            return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
        const fileData = await (0, gridfs_service_1.uploadFile)(file);
        const updatedOrder = await order_model_1.default.findByIdAndUpdate(orderId, {
            $push: {
                files: { ...fileData, originalname: file.originalname },
            },
        }, { new: true }).lean();
        if (!updatedOrder)
            return next(new ErrorHandler_1.ErrorHandler('Failed to update order', 500));
        res.status(200).json((0, response_types_1.SuccessResponse)(updatedOrder, 'File uploaded successfully'));
    }
    catch (error) {
        console.error('Error uploading order file:', error);
        return next(new ErrorHandler_1.ErrorHandler(`File upload failed: ${error.message}`, 500));
    }
};
exports.uploadOrderFile = uploadOrderFile;
const getOrderFiles = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.userId;
        const order = await order_model_1.default.findOne({ _id: orderId, userId });
        if (!order)
            return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
        const files = order.files;
        res.status(200).json((0, response_types_1.SuccessResponse)(files, 'Files fetched successfully'));
    }
    catch (error) {
        console.error('Error getting order files:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while fetching files', 500));
    }
};
exports.getOrderFiles = getOrderFiles;
const deleteOrderFile = async (req, res, next) => {
    try {
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
    }
    catch (error) {
        console.error('Error deleting order file:', error);
        return next(new ErrorHandler_1.ErrorHandler(`File deletion failed: ${error.message}`, 500));
    }
};
exports.deleteOrderFile = deleteOrderFile;
