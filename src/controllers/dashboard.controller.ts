import { NextFunction, Request, Response } from 'express'
import { DashboardCard } from '../models/dashboard.models'
import Order from '../models/order.model'
import { OrderStatus } from '../types/order.types'
import { SuccessResponse } from '../types/response.types'
import { CatchAsyncErrors } from '../utils/ErrorHandler'

export const getAdminDashboardCards = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const activeStatuses = [OrderStatus.PENDING, OrderStatus.PROCESSING]
		const completedStatuses = [
			OrderStatus.REQUIRES_INVOICE,
			OrderStatus.REQUIRES_CHARGE,
		]
		const paidStatuses = [OrderStatus.CHARGED]
		const archivedStatuses = [OrderStatus.FINISHED, OrderStatus.CANCELLED]

		const activeOrders = await Order.find({
			status: { $in: activeStatuses },
		}).countDocuments()
		const ordersThatRequireInvoiceOrCharge = await Order.find({
			status: { $in: completedStatuses },
		}).countDocuments()
		const ordersThatArePaid = await Order.find({
			status: { $in: paidStatuses },
		}).countDocuments()
		const ordersThatAreArchived = await Order.find({
			status: { $in: archivedStatuses },
		}).countDocuments()

		const response: DashboardCard[] = [
			{
				title: 'Active Orders',
				value: activeOrders,
				description: 'Total active orders created',
			},
			{
				title: 'Orders to Charge',
				value: ordersThatRequireInvoiceOrCharge,
				description: 'Total orders that require a charge',
			},
			{
				title: 'Paid Orders',
				value: ordersThatArePaid,
				description: 'Total paid accounts',
			},
			{
				title: 'Finished Orders',
				value: ordersThatAreArchived,
				description: 'Total finished orders',
			},
		]

		res.status(200).json(
			SuccessResponse<DashboardCard[]>(
				response,
				'Dashboard cards retrieved successfully',
			),
		)
	},
)
