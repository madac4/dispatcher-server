import { NextFunction, Request, Response } from 'express'
import {
	ModeratorOrderDTO,
	OrderDTO,
	PaginatedOrderDTO,
} from '../dto/order.dto'
import Order from '../models/order.model'
import Settings from '../models/settings.model'
import { ChatService } from '../services/chat.service'
import {
	deleteFile,
	fileExists,
	getFile,
	uploadFile,
} from '../services/gridfs.service'
import { notificationService } from '../services/notification.service'
import { socketService } from '../services/socket.service'
import { UserRole } from '../types/auth.types'
import {
	formatStatus,
	ICreateOrderRequest,
	IOrder,
	OrderStatus,
	OrderStatusType,
} from '../types/order.types'
import {
	CreatePaginationMeta,
	PaginatedResponse,
	PaginationMeta,
	PaginationQuery,
	SuccessResponse,
} from '../types/response.types'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'

export const createOrder = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user.id

		const settings = await Settings.findOne({ userId })
		if (
			!settings ||
			!settings.carrierNumbers?.mcNumber ||
			!settings.carrierNumbers?.dotNumber ||
			!settings.carrierNumbers?.einNumber
		) {
			return next(
				new ErrorHandler(
					'Please complete your company information and carrier numbers in settings',
					404,
				),
			)
		}

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
			stops:
				typeof orderData.stops === 'string'
					? JSON.parse(orderData.stops)
					: orderData.stops || [],
			files: [],
			status: 'pending',
			axleConfigs:
				typeof orderData.axleConfigs === 'string'
					? JSON.parse(orderData.axleConfigs)
					: orderData.axleConfigs || [],
		})

		const savedOrder = await newOrder.save()

		if (!savedOrder) {
			return next(new ErrorHandler('Failed to create order', 500))
		}

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
			`New order #${savedOrder.orderNumber} has been created. Status: ${formatStatus(savedOrder.status)}`,
			'system',
		)

		await notificationService.notifyOrderCreated(
			savedOrder._id!.toString(),
			savedOrder.orderNumber!,
			userId,
		)

		if (orderData.messages) {
			const messages = (
				typeof orderData.messages === 'string'
					? JSON.parse(orderData.messages)
					: orderData.messages
			) as string[]

			messages.forEach(async message => {
				await ChatService.sendUserMessage(
					savedOrder._id,
					message,
					userId,
				)
			})
		}

		socketService.broadcastOrderUpdate(savedOrder._id!.toString(), {
			type: 'order_created',
			order: savedOrder,
		})

		res.status(201).json(SuccessResponse({}, 'Order created successfully'))
	},
)

export const moderateOrder = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user.id
		const { orderId } = req.params

		const order = await Order.findById(orderId)

		if (!order) return next(new ErrorHandler('Order not found', 404))

		order.moderatorId = userId
		order.status = OrderStatus.PROCESSING
		await order.save()

		const userSettings = await Settings.findOne({ userId: order.userId })
		if (!userSettings)
			return next(new ErrorHandler('User settings not found', 404))

		const orderDTO = new ModeratorOrderDTO(order, userSettings)

		res.status(200).json(
			SuccessResponse(orderDTO, 'Order moderated successfully'),
		)
	},
)

export const duplicateOrder = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user.userId
		const { orderId } = req.params

		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		const order = await Order.findById(orderId)

		if (!order) return next(new ErrorHandler('Order not found', 404))

		const newOrder = await Order.create({
			...order,
			userId,
		})

		res.status(201).json(
			SuccessResponse(
				new OrderDTO(newOrder),
				'Order duplicated successfully',
			),
		)
	},
)

export const getOrders = CatchAsyncErrors(
	async (req: Request, res: Response) => {
		const userId = req.user.id
		const userRole = req.user.role

		const { page, limit, search } = req.query as unknown as PaginationQuery
		const statuses = (req.query['status[]'] as string[]) || []

		const skip = (page - 1) * limit

		let query: any = {
			status: { $in: statuses || [] },
			$or: [
				{ orderNumber: { $regex: search, $options: 'i' } },
				{ 'truckId.unitNumber': { $regex: search, $options: 'i' } },
				{ destinationAddress: { $regex: search, $options: 'i' } },
				{ originAddress: { $regex: search, $options: 'i' } },
			],
		}

		if (userRole === UserRole.USER) {
			query.userId = userId
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
	},
)

export const getStatuses = CatchAsyncErrors(
	async (req: Request, res: Response) => {
		const { type } = req.params as { type: OrderStatusType }
		const user = req.user
		let statuses: OrderStatus[] = []

		switch (type) {
			case OrderStatusType.ACTIVE:
				statuses = [OrderStatus.PENDING, OrderStatus.PROCESSING]
				break
			case OrderStatusType.COMPLETED:
				statuses = [
					OrderStatus.REQUIRES_INVOICE,
					OrderStatus.REQUIRES_CHARGE,
				]
				break
			case OrderStatusType.PAID:
				statuses = [OrderStatus.CHARGED]
				break
			case OrderStatusType.ARCHIVED:
				statuses = [OrderStatus.FINISHED, OrderStatus.CANCELLED]
				break

			default:
				statuses = Object.values(OrderStatus)
				break
		}

		const response = await Promise.all([
			{
				value: 'all',
				label: 'All Statuses',
				quantity: await Order.countDocuments({
					[user.role === UserRole.USER ? 'userId' : '']:
						user.role === UserRole.USER ? user.userId : null,
					status: { $in: statuses },
				}),
			},
			...statuses.map(async status => {
				const count = await Order.countDocuments({
					[user.role === UserRole.USER ? 'userId' : '']:
						user.role === UserRole.USER ? user.userId : null,
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
	},
)

export const getOrderByNumber = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { orderNumber } = req.params
		const user = req.user

		if (!orderNumber)
			return next(new ErrorHandler('Order number is required', 400))

		let query: any = { orderNumber }

		if (user.role === UserRole.USER) {
			query.userId = user.id
		}

		const order = await Order.findOne(query)
			.populate('truckId')
			.populate('trailerId')
			.populate('moderatorId')

		if (!order) return next(new ErrorHandler('Order not found', 404))

		if (user.role !== UserRole.USER) {
			const userSettings = await Settings.findOne({
				userId: order.userId,
			})
			if (!userSettings)
				return next(new ErrorHandler('User settings not found', 404))

			const orderDTO = new ModeratorOrderDTO(order, userSettings)

			return res
				.status(200)
				.json(SuccessResponse(orderDTO, 'Order retrieved successfully'))
		}

		const orderDTO = new OrderDTO(order)

		res.status(200).json(
			SuccessResponse(orderDTO, 'Order retrieved successfully'),
		)
	},
)

export const downloadOrderFile = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { id, role } = req.user
		const { filename, orderId } = req.params

		let orderQuery = {
			_id: orderId,
			userId: id,
			'files.filename': filename,
		}

		if (role === UserRole.MODERATOR || role === UserRole.ADMIN) {
			delete orderQuery.userId
		}

		const order = await Order.findOne(orderQuery).lean()

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
	},
)

export const uploadOrderFile = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const file = req.file as Express.Multer.File
		const user = req.user

		if (!file) return next(new ErrorHandler('File is required', 400))

		const { orderId } = req.params

		const query =
			user.role === UserRole.USER
				? { _id: orderId, userId: user.userId }
				: { _id: orderId }

		const order = await Order.findOne(query)
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
	},
)

export const getOrderFiles = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { orderId } = req.params
		const userId = req.user.userId

		const order = await Order.findOne({ _id: orderId, userId })

		if (!order) return next(new ErrorHandler('Order not found', 404))

		const files = order.files
		res.status(200).json(
			SuccessResponse(files, 'Files fetched successfully'),
		)
	},
)

export const deleteOrderFile = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { filename, orderId } = req.params
		const userId = req.user.userId

		const order = await Order.findOne({
			userId,
			_id: orderId,
			'files.filename': filename,
		})

		if (!order)
			return next(
				new ErrorHandler('File not found or access denied', 404),
			)

		await Order.updateOne({ userId }, { $pull: { files: { filename } } })

		await deleteFile(filename)

		res.status(200).json(SuccessResponse(null, 'File deleted successfully'))
	},
)

export const updateOrderStatus = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { orderId } = req.params
		const { status } = req.body

		const order = await Order.findById(orderId)
		if (!order) return next(new ErrorHandler('Order not found', 404))

		order.status = status
		await order.save()

		socketService.broadcastOrderUpdate(orderId, {
			type: 'order_status_updated',
			order: order,
		})

		await ChatService.sendSystemMessage(
			orderId,
			`Order #${order.orderNumber} status has been updated to ${formatStatus(status)}`,
			'system',
		)

		res.status(200).json(
			SuccessResponse(
				order,
				`Order status updated successfully to ${formatStatus(status)}`,
			),
		)
	},
)
