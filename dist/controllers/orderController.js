"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderById = exports.createOrder = void 0;
const order_model_1 = __importDefault(require("../models/order.model"));
const chat_service_1 = require("../services/chat.service");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
const createOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        if (!userId)
            return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
        const orderData = req.body;
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
            if (!orderData[field]) {
                return next(new ErrorHandler_1.ErrorHandler(`Missing required field: ${field}`, 400));
            }
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
            orderMessage: orderData.orderMessage || '',
            files: [],
            status: 'pending',
        });
        const savedOrder = await newOrder.save();
        // Create initial system message for the order
        await chat_service_1.ChatService.sendSystemMessage(savedOrder._id.toString(), `New order #${savedOrder.orderNumber} has been created. Status: ${savedOrder.status}`, 'system');
        // If there's an order message, send it as a user message
        if (orderData.orderMessage) {
            await chat_service_1.ChatService.sendSystemMessage(savedOrder._id.toString(), orderData.orderMessage, 'user');
        }
        res.status(201).json((0, response_types_1.SuccessResponse)(savedOrder, 'Order created successfully'));
    }
    catch (error) {
        console.error('Error creating order:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while creating order', 500));
    }
};
exports.createOrder = createOrder;
// export const getOrders = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = (req as any).user?.id
//     if (!userId) {
//       res.status(401).json({ success: false, message: 'User not authenticated' })
//       return
//     }
//     const page = parseInt(req.query.page as string) || 1
//     const limit = parseInt(req.query.limit as string) || 10
//     const status = req.query.status as string
//     const skip = (page - 1) * limit
//     // Build query
//     const query: any = { userId }
//     if (status) {
//       query.status = status
//     }
//     const orders = await Order.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate('truckId', 'unitNumber year make licencePlate state')
//       .populate('trailerId', 'unitNumber year make licencePlate state')
//     const total = await Order.countDocuments(query)
//     const response: IOrderResponse = {
//       success: true,
//       message: 'Orders retrieved successfully',
//       orders,
//       total,
//       page,
//       limit,
//     }
//     res.status(200).json(response)
//   } catch (error) {
//     console.error('Error getting orders:', error)
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error while retrieving orders',
//     })
//   }
// }
const getOrderById = async (req, res, next) => {
    try {
        const userId = req.user.id;
        if (!userId)
            return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
        const { id } = req.params;
        const order = await order_model_1.default.findOne({ _id: id, userId })
            .populate('truckId', 'unitNumber year make licencePlate state nrOfAxles vin')
            .populate('trailerId', 'unitNumber year make licencePlate state nrOfAxles vin length type');
        if (!order) {
            return next(new ErrorHandler_1.ErrorHandler('Order not found', 404));
        }
        res.status(200).json((0, response_types_1.SuccessResponse)(order, 'Order retrieved successfully'));
    }
    catch (error) {
        console.error('Error getting order:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while retrieving order', 500));
    }
};
exports.getOrderById = getOrderById;
// export const updateOrder = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = (req as any).user?.id
//     if (!userId) {
//       res.status(401).json({ success: false, message: 'User not authenticated' })
//       return
//     }
//     const { id } = req.params
//     const updateData: IUpdateOrderRequest = req.body
//     const order = await Order.findOne({ _id: id, userId })
//     if (!order) {
//       res.status(404).json({ success: false, message: 'Order not found' })
//       return
//     }
//     // Update fields
//     Object.keys(updateData).forEach(key => {
//       if (key === 'permitStartDate' && updateData[key]) {
//         ;(order as any)[key] = new Date(updateData[key] as string)
//       } else if (updateData[key as keyof IUpdateOrderRequest] !== undefined) {
//         ;(order as any)[key] = updateData[key as keyof IUpdateOrderRequest]
//       }
//     })
//     const updatedOrder = await order.save()
//     const response: IOrderResponse = {
//       success: true,
//       message: 'Order updated successfully',
//       data: updatedOrder,
//     }
//     res.status(200).json(response)
//   } catch (error) {
//     console.error('Error updating order:', error)
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error while updating order',
//     })
//   }
// }
// Delete an order
// export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = (req as any).user?.id
//     if (!userId) {
//       res.status(401).json({ success: false, message: 'User not authenticated' })
//       return
//     }
//     const { id } = req.params
//     const order = await Order.findOne({ _id: id, userId })
//     if (!order) {
//       res.status(404).json({ success: false, message: 'Order not found' })
//       return
//     }
//     await Order.findByIdAndDelete(id)
//     res.status(200).json({
//       success: true,
//       message: 'Order deleted successfully',
//     })
//   } catch (error) {
//     console.error('Error deleting order:', error)
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error while deleting order',
//     })
//   }
// }
// export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = (req as any).user?.id
//     if (!userId) {
//       res.status(401).json({ success: false, message: 'User not authenticated' })
//       return
//     }
//     const { id } = req.params
//     const { status } = req.body
//     if (!status || !['pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'].includes(status)) {
//       res.status(400).json({
//         success: false,
//         message: 'Invalid status. Must be one of: pending, approved, rejected, in_progress, completed, cancelled',
//       })
//       return
//     }
//     const order = await Order.findOne({ _id: id, userId })
//     if (!order) {
//       res.status(404).json({ success: false, message: 'Order not found' })
//       return
//     }
//     order.status = status
//     const updatedOrder = await order.save()
//     const response: IOrderResponse = {
//       success: true,
//       message: 'Order status updated successfully',
//       data: updatedOrder,
//     }
//     res.status(200).json(response)
//   } catch (error) {
//     console.error('Error updating order status:', error)
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error while updating order status',
//     })
//   }
// }
// export const calculateOrderCosts = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = (req as any).user?.id
//     if (!userId) {
//       res.status(401).json({ success: false, message: 'User not authenticated' })
//       return
//     }
//     const { originAddress, destinationAddress, ...orderData } = req.body
//     if (!originAddress || !destinationAddress) {
//       res.status(400).json({
//         success: false,
//         message: 'Origin and destination addresses are required',
//       })
//       return
//     }
//     // Get route information
//     const routeInfo = await OrderService.getRouteInfo(originAddress, destinationAddress)
//     // Create a temporary order object for cost calculation
//     const tempOrder = {
//       ...orderData,
//       originAddress,
//       destinationAddress,
//     } as any
//     // Calculate costs
//     const costs = OrderService.calculateCosts(tempOrder, routeInfo)
//     res.status(200).json({
//       success: true,
//       message: 'Costs calculated successfully',
//       data: {
//         costs,
//         routeInfo,
//       },
//     })
//   } catch (error) {
//     console.error('Error calculating costs:', error)
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error while calculating costs',
//     })
//   }
// }
