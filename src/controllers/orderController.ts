import { NextFunction, Request, Response } from 'express'
import { OrderDTO, PaginatedOrderDTO } from '../dto/order.dto'
import Order from '../models/order.model'
import { ChatService } from '../services/chat.service'
import {
	deleteFile,
	fileExists,
	getFile,
	uploadFile,
} from '../services/gridfs.service'
import { socketService } from '../services/socket.service'
import {
	formatStatus,
	ICreateOrderRequest,
	IOrder,
	OrderStatus,
} from '../types/order.types'
import {
	CreatePaginationMeta,
	PaginatedResponse,
	PaginationMeta,
	PaginationQuery,
	SuccessResponse,
} from '../types/response.types'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'

export const createOrder = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const userId = req.user.userId

		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		const orderData: ICreateOrderRequest = req.body
		const files = req.files as Express.Multer.File[]

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
		]

		for (const field of requiredFields) {
			if (!orderData[field as keyof ICreateOrderRequest])
				return next(
					new ErrorHandler(`Missing required field: ${field}`, 400),
				)
		}

		const newOrder = new Order({
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
			stops: orderData.stops || [],
			files: [],
			status: 'pending',
		})

		const savedOrder = await newOrder.save()

		if (files && files.length > 0) {
			const uploadedFiles = []

			for (const file of files) {
				try {
					const fileData = await uploadFile(file)
					uploadedFiles.push({
						...fileData,
						originalname: file.originalname,
					})
				} catch (error: any) {
					console.error('Error uploading file:', error)
				}
			}

			if (uploadedFiles.length > 0) {
				await Order.findByIdAndUpdate(
					savedOrder._id,
					{ $push: { files: { $each: uploadedFiles } } },
					{ new: true },
				)
			}
		}

		await ChatService.sendSystemMessage(
			savedOrder._id!.toString(),
			`New order #${savedOrder.orderNumber} has been created. Status: ${savedOrder.status}`,
			'system',
		)

		socketService.broadcastOrderUpdate(savedOrder._id!.toString(), {
			type: 'order_created',
			order: savedOrder,
		})

		res.status(201).json(SuccessResponse({}, 'Order created successfully'))
	} catch (error) {
		console.error('Error creating order:', error)
		return next(
			new ErrorHandler('Internal server error while creating order', 500),
		)
	}
}

export const duplicateOrder = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user.userId

		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		const { orderId } = req.params

		const order = await Order.findById(orderId)

		if (!order) return next(new ErrorHandler('Order not found', 404))

		const newOrder = await Order.create({
			...order,
			userId,
		})

		console.log(newOrder)

		res.status(201).json(
			SuccessResponse(
				new OrderDTO(newOrder),
				'Order duplicated successfully',
			),
		)
	},
)

export const getOrders = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const userId = req.user.userId

		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		const { page, limit, search } = req.query as unknown as PaginationQuery
		const statuses = (req.query['status[]'] as string[]) || []

		const skip = (page - 1) * limit

		const query = {
			userId,
			status: { $in: statuses || [] },
			$or: [
				{ orderNumber: { $regex: search, $options: 'i' } },
				{ 'truckId.unitNumber': { $regex: search, $options: 'i' } },
				{ destinationAddress: { $regex: search, $options: 'i' } },
				{ originAddress: { $regex: search, $options: 'i' } },
			],
		}

		const orders = await Order.find(query)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.populate('truckId', 'unitNumber year make licencePlate state')
			.populate('trailerId', 'unitNumber year make licencePlate state')
			.lean()

		const totalItems = await Order.countDocuments(query)
		const orderDtos = orders.map(
			order => new PaginatedOrderDTO(order as IOrder),
		)
		const meta: PaginationMeta = CreatePaginationMeta(
			totalItems,
			page,
			limit,
		)

		res.status(200).json(PaginatedResponse(orderDtos, meta))
	} catch (error) {
		console.error('Error getting orders:', error)
		res.status(500).json({
			success: false,
			message: 'Internal server error while retrieving orders',
		})
	}
}

export const getStatuses = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const { type } = req.params as { type: string }
		let statuses: OrderStatus[] = []

		if (type === 'active') {
			statuses = [
				OrderStatus.ACTIVE,
				OrderStatus.PENDING,
				OrderStatus.PROCESSING,
			]
		} else if (type === 'completed') {
			statuses = [
				OrderStatus.REQUIRES_INVOICE,
				OrderStatus.REQUIRES_CHARGE,
			]
		} else if (type === 'paid') {
			statuses = [OrderStatus.CHARGED]
		} else if (type === 'archived') {
			statuses = [OrderStatus.COMPLETED, OrderStatus.CANCELLED]
		} else {
			statuses = Object.values(OrderStatus)
		}

		const response = await Promise.all([
			{
				value: 'all',
				label: 'All Statuses',
				quantity: await Order.countDocuments({
					userId: req.user.userId,
					status: { $in: statuses },
				}),
			},
			...statuses.map(async status => {
				const count = await Order.countDocuments({
					userId: req.user.userId,
					status: status,
				})
				return {
					value: status,
					label: formatStatus(status),
					quantity: count,
				}
			}),
		])

		res.status(200).json(
			SuccessResponse(response, 'Statuses retrieved successfully'),
		)
	} catch (error) {
		console.error('Error getting statuses:', error)
		res.status(500).json({
			success: false,
			message: 'Internal server error while retrieving statuses',
		})
	}
}

export const getOrderByNumber = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const userId = req.user.userId
		const { orderNumber } = req.params

		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		if (!orderNumber)
			return next(new ErrorHandler('Order number is required', 400))

		const order = await Order.findOne({ orderNumber, userId })
			.populate('truckId')
			.populate('trailerId')

		if (!order) return next(new ErrorHandler('Order not found', 404))

		res.status(200).json(
			SuccessResponse(
				new OrderDTO(order),
				'Order retrieved successfully',
			),
		)
	} catch (error) {
		console.error('Error getting order by number:', error)
		return next(
			new ErrorHandler(
				'Internal server error while retrieving order',
				500,
			),
		)
	}
}

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

export const uploadOrderFile = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const file = req.file

		if (!file) return next(new ErrorHandler('File is required', 400))

		const { orderId } = req.params
		const userId = req.user.userId

		const order = await Order.findOne({ _id: orderId, userId })
		if (!order) return next(new ErrorHandler('Order not found', 404))

		const fileData = await uploadFile(file)
		const updatedOrder = await Order.findByIdAndUpdate(
			orderId,
			{
				$push: {
					files: { ...fileData, originalname: file.originalname },
				},
			},
			{ new: true },
		).lean()

		if (!updatedOrder)
			return next(new ErrorHandler('Failed to update order', 500))

		res.status(200).json(
			SuccessResponse(updatedOrder, 'File uploaded successfully'),
		)
	} catch (error: any) {
		console.error('Error uploading order file:', error)
		return next(
			new ErrorHandler(`File upload failed: ${error.message}`, 500),
		)
	}
}

export const getOrderFiles = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const { orderId } = req.params
		const userId = req.user.userId

		const order = await Order.findOne({ _id: orderId, userId })

		if (!order) return next(new ErrorHandler('Order not found', 404))

		const files = order.files
		res.status(200).json(
			SuccessResponse(files, 'Files fetched successfully'),
		)
	} catch (error) {
		console.error('Error getting order files:', error)
		return next(
			new ErrorHandler('Internal server error while fetching files', 500),
		)
	}
}

export const downloadOrderFile = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const { filename } = req.params
		const userId = req.user.userId

		const order = await Order.findOne({
			userId,
			'files.filename': filename,
		}).lean()

		if (!order)
			return next(
				new ErrorHandler('File not found or access denied', 404),
			)

		const fileData = order.files.find(
			(file: any) => file.filename === filename,
		)
		if (!fileData)
			return next(new ErrorHandler('File metadata not found', 404))

		const exists = await fileExists(filename)
		if (!exists) {
			return next(new ErrorHandler('File not found in storage', 404))
		}

		res.setHeader(
			'Content-Disposition',
			`attachment; filename="${fileData.originalname}"`,
		)
		res.setHeader('Content-Type', fileData.contentType)

		const fileStream = await getFile(filename)
		fileStream.pipe(res)
	} catch (error: any) {
		console.error('Error downloading order file:', error)
		return next(
			new ErrorHandler(`File download failed: ${error.message}`, 500),
		)
	}
}

export const deleteOrderFile = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const { filename } = req.params
		const userId = req.user.userId

		const order = await Order.findOne({
			userId,
			'files.filename': filename,
		})

		if (!order)
			return next(
				new ErrorHandler('File not found or access denied', 404),
			)

		await Order.updateOne({ userId }, { $pull: { files: { filename } } })

		await deleteFile(filename)

		res.status(200).json(SuccessResponse(null, 'File deleted successfully'))
	} catch (error: any) {
		console.error('Error deleting order file:', error)
		return next(
			new ErrorHandler(`File deletion failed: ${error.message}`, 500),
		)
	}
}
