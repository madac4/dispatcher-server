import { NextFunction, Request, Response } from 'express'
import Invoice from '../models/invoice.model'
import Order from '../models/order.model'
import Settings from '../models/settings.model'
import User from '../models/user.model'
import { EmailService } from '../services/email.service'
import { notificationService } from '../services/notification.service'
import { UserRole } from '../types/auth.types'
import {
	CreateInvoiceRequest,
	InvoiceQuery,
	UpdateInvoiceRequest,
} from '../types/invoice.types'
import { OrderStatus } from '../types/order.types'
import {
	CreatePaginationMeta,
	PaginatedResponse,
	SuccessResponse,
} from '../types/response.types'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'

export const getUsersForInvoice = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const users = await User.find({ role: UserRole.USER })
			.select('_id email createdAt')
			.lean()

		const usersWithCompanyInfo = await Promise.all(
			users.map(async user => {
				const settings = await Settings.findOne({
					userId: user._id.toString(),
				})
					.select('companyInfo')
					.lean()

				return {
					_id: user._id,
					email: user.email,
					createdAt: user.createdAt,
					companyInfo: settings?.companyInfo || null,
				}
			}),
		)

		// Filter to only include users with complete company info
		const usersWithCompleteCompanyInfo = usersWithCompanyInfo.filter(
			user =>
				user.companyInfo &&
				user.companyInfo.name &&
				user.companyInfo.address &&
				user.companyInfo.city &&
				user.companyInfo.state &&
				user.companyInfo.zip &&
				user.companyInfo.phone &&
				user.companyInfo.email,
		)

		res.status(200).json(
			SuccessResponse(
				usersWithCompleteCompanyInfo,
				'Users with complete company info fetched successfully',
			),
		)
	},
)

export const createInvoice = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { userId, startDate, endDate, charges }: CreateInvoiceRequest =
			req.body

		const adminId = req.user.userId

		if (
			!userId ||
			!startDate ||
			!endDate ||
			!charges ||
			charges.length === 0
		) {
			return next(
				new ErrorHandler(
					'User ID, start date, end date, and charges are required',
					400,
				),
			)
		}

		const start = new Date(startDate)
		const end = new Date(endDate)

		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			return next(new ErrorHandler('Invalid date format', 400))
		}

		if (start > end) {
			return next(
				new ErrorHandler('Start date must be before end date', 400),
			)
		}

		for (const charge of charges) {
			if (!charge.state) {
				return next(
					new ErrorHandler('State is required for all charges', 400),
				)
			}
			if (charge.total === undefined || charge.total === null) {
				charge.total =
					(charge.oversize || 0) +
					(charge.overweight || 0) +
					(charge.superload || 0) +
					(charge.serviceFee || 0) +
					(charge.escort || 0)
			}
		}

		const user = await User.findById(userId)
		if (!user) {
			return next(new ErrorHandler('User not found', 404))
		}

		const settings = await Settings.findOne({ userId: userId })
		if (!settings || !settings.companyInfo) {
			return next(
				new ErrorHandler(
					'User settings or company information not found',
					404,
				),
			)
		}

		const totalAmount = charges.reduce(
			(sum, charge) => sum + charge.total,
			0,
		)

		// Fetch orders for the user within the date range with REQUIRES_INVOICE status
		const orders = await Order.find({
			userId: userId,
			permitStartDate: {
				$gte: start,
				$lte: end,
			},
			status: OrderStatus.REQUIRES_INVOICE,
		})
			.populate('truckId', 'unitNumber')
			.populate('trailerId', 'unitNumber')
			.lean()

		// Store order IDs for status update
		const orderIds = orders.map(order => order._id)

		// Check if there are any orders with REQUIRES_INVOICE status
		if (!orders || !orders.length) {
			return next(
				new ErrorHandler(
					'No orders with status "Requires Invoice" found for the selected period',
					400,
				),
			)
		}

		// Map orders to invoice order format
		const invoiceOrders = orders.map(order => ({
			orderNumber: order.orderNumber || '',
			contact: order.contact,
			permitStartDate: order.permitStartDate,
			truckNumber:
				typeof order.truckId === 'object' && order.truckId
					? (order.truckId as any).unitNumber || ''
					: '',
			trailerNumber:
				typeof order.trailerId === 'object' && order.trailerId
					? (order.trailerId as any).unitNumber || ''
					: '',
			commodity: order.commodity,
			lengthFt: order.lengthFt,
			lengthIn: order.lengthIn,
			widthFt: order.widthFt,
			widthIn: order.widthIn,
			heightFt: order.heightFt,
			heightIn: order.heightIn,
			rearOverhangFt: order.rearOverhangFt,
			rearOverhangIn: order.rearOverhangIn,
			makeModel: order.makeModel,
			serial: order.serial,
			singleMultiple: order.singleMultiple,
			legalWeight: order.legalWeight,
			originAddress: order.originAddress,
			destinationAddress: order.destinationAddress,
		}))

		const invoice = new Invoice({
			userId: userId,
			companyInfo: settings.companyInfo,
			startDate: start,
			endDate: end,
			orders: invoiceOrders,
			charges: charges,
			totalAmount: totalAmount,
			createdBy: adminId,
		})

		const savedInvoice = await invoice.save()

		if (!savedInvoice) {
			return next(new ErrorHandler('Failed to create invoice', 500))
		}

		// Send email to user automatically
		try {
			const invoiceUrl = `${process.env.FRONTEND_ORIGIN}/dashboard/invoices/${savedInvoice._id}`
			const downloadUrl = `${process.env.FRONTEND_ORIGIN}/api/invoices/${savedInvoice._id}/download`

			await EmailService.sendEmail(
				'invoiceEmail',
				{
					invoiceNumber: savedInvoice.invoiceNumber,
					totalAmount: savedInvoice.totalAmount,
					startDate: savedInvoice.startDate,
					endDate: savedInvoice.endDate,
					createdAt: savedInvoice.createdAt,
					invoiceUrl,
					downloadUrl,
				},
				user.email,
				`Invoice ${savedInvoice.invoiceNumber} - Click Permit`,
			)
		} catch (error: any) {
			console.error('Failed to send invoice email:', error)
		}

		// Update orders status to REQUIRES_CHARGE
		try {
			await Order.updateMany(
				{ _id: { $in: orderIds } },
				{ $set: { status: OrderStatus.REQUIRES_CHARGE } },
			)
		} catch (error: any) {
			console.error('Failed to update orders status:', error)
		}

		// Send notification to user
		try {
			await notificationService.notifyInvoiceCreated(
				savedInvoice._id.toString(),
				savedInvoice.invoiceNumber,
				userId,
				adminId,
			)
		} catch (error: any) {
			console.error('Failed to send invoice notification:', error)
		}

		res.status(201).json(
			SuccessResponse(
				savedInvoice,
				'Invoice created successfully and email sent',
			),
		)
	},
)

export const getInvoiceById = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { id } = req.params
		const userRole = req.user.role
		const currentUserId = req.user.userId || req.user.id

		const invoice = await Invoice.findById(id).lean()

		if (!invoice) {
			return next(new ErrorHandler('Invoice not found', 404))
		}

		// If user is not admin, only allow access to their own invoices
		if (userRole !== UserRole.ADMIN && invoice.userId !== currentUserId) {
			return next(new ErrorHandler('Access denied', 403))
		}

		res.status(200).json(
			SuccessResponse(invoice, 'Invoice fetched successfully'),
		)
	},
)

export const getInvoices = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const {
			userId,
			startDate,
			endDate,
			page = '1',
			limit = '10',
		} = req.query as InvoiceQuery

		const pageNum = parseInt(page.toString(), 10)
		const limitNum = parseInt(limit.toString(), 10)
		const skip = (pageNum - 1) * limitNum

		const userRole = req.user.role
		const currentUserId = req.user.userId || req.user.id

		const filter: any = {}

		// If user is not admin, only show their own invoices
		if (userRole !== UserRole.ADMIN) {
			filter.userId = currentUserId
		} else if (userId) {
			// Admin can filter by userId if provided
			filter.userId = userId
		}

		if (startDate || endDate) {
			filter.startDate = {}
			if (startDate) {
				filter.startDate.$gte = new Date(startDate)
			}
			if (endDate) {
				filter.startDate.$lte = new Date(endDate)
			}
		}

		const [invoices, totalItems] = await Promise.all([
			Invoice.find(filter)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limitNum)
				.lean(),
			Invoice.countDocuments(filter),
		])

		const meta = CreatePaginationMeta(totalItems, pageNum, limitNum)

		res.status(200).json(
			PaginatedResponse(invoices, meta, 'Invoices fetched successfully'),
		)
	},
)

// Update invoice (admin only)
export const updateInvoice = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { id } = req.params
		const { startDate, endDate, charges }: UpdateInvoiceRequest = req.body

		const invoice = await Invoice.findById(id)

		if (!invoice) {
			return next(new ErrorHandler('Invoice not found', 404))
		}

		// Update fields
		if (startDate) {
			const start = new Date(startDate)
			if (isNaN(start.getTime())) {
				return next(new ErrorHandler('Invalid start date format', 400))
			}
			invoice.startDate = start
		}

		if (endDate) {
			const end = new Date(endDate)
			if (isNaN(end.getTime())) {
				return next(new ErrorHandler('Invalid end date format', 400))
			}
			invoice.endDate = end
		}

		// Validate dates
		if (invoice.startDate > invoice.endDate) {
			return next(
				new ErrorHandler('Start date must be before end date', 400),
			)
		}

		if (charges && charges.length > 0) {
			// Validate and calculate totals for charges
			for (const charge of charges) {
				if (!charge.state) {
					return next(
						new ErrorHandler(
							'State is required for all charges',
							400,
						),
					)
				}
				if (charge.total === undefined || charge.total === null) {
					charge.total =
						(charge.oversize || 0) +
						(charge.overweight || 0) +
						(charge.superload || 0) +
						(charge.serviceFee || 0) +
						(charge.escort || 0)
				}
			}
			invoice.charges = charges
		}

		// Recalculate total amount
		if (invoice.charges && invoice.charges.length > 0) {
			invoice.totalAmount = invoice.charges.reduce(
				(sum, charge) => sum + charge.total,
				0,
			)
		}

		await invoice.save()

		res.status(200).json(
			SuccessResponse(invoice, 'Invoice updated successfully'),
		)
	},
)

// Delete invoice (admin only)
export const deleteInvoice = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { id } = req.params

		// Get invoice before deleting to access order information
		const invoice = await Invoice.findById(id)

		if (!invoice) {
			return next(new ErrorHandler('Invoice not found', 404))
		}

		// Extract order numbers from the invoice
		const orderNumbers = invoice.orders.map(order => order.orderNumber)

		// Revert orders status from REQUIRES_CHARGE back to REQUIRES_INVOICE
		if (orderNumbers.length > 0) {
			try {
				await Order.updateMany(
					{
						userId: invoice.userId,
						orderNumber: { $in: orderNumbers },
						status: OrderStatus.REQUIRES_CHARGE,
					},
					{ $set: { status: OrderStatus.REQUIRES_INVOICE } },
				)
			} catch (error: any) {
				console.error('Failed to revert orders status:', error)
				// Continue with deletion even if status update fails
			}
		}

		// Delete the invoice
		await Invoice.findByIdAndDelete(id)

		res.status(200).json(
			SuccessResponse(null, 'Invoice deleted successfully'),
		)
	},
)

// Send invoice email (admin only)
export const sendInvoiceEmail = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { id } = req.params

		const invoice = await Invoice.findById(id).lean()

		if (!invoice) {
			return next(new ErrorHandler('Invoice not found', 404))
		}

		const user = await User.findById(invoice.userId)
		if (!user) {
			return next(new ErrorHandler('User not found', 404))
		}

		const invoiceUrl = `${process.env.FRONTEND_ORIGIN}/dashboard/invoices/${invoice._id}`
		const apiUrl =
			process.env.API_URL ||
			process.env.FRONTEND_ORIGIN ||
			'http://localhost:3000'
		const downloadUrl = `${apiUrl}/api/invoices/${invoice._id}/download`

		await EmailService.sendEmail(
			'invoiceEmail',
			{
				invoiceNumber: invoice.invoiceNumber,
				totalAmount: invoice.totalAmount,
				startDate: invoice.startDate,
				endDate: invoice.endDate,
				createdAt: invoice.createdAt,
				invoiceUrl,
				downloadUrl,
			},
			user.email,
			`Invoice ${invoice.invoiceNumber} - Click Permit`,
		)

		res.status(200).json(
			SuccessResponse(null, 'Invoice email sent successfully'),
		)
	},
)

// Download invoice as PDF
export const downloadInvoice = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { id } = req.params
		const userRole = req.user.role
		const currentUserId = req.user.userId || req.user.id

		const invoice = await Invoice.findById(id).lean()

		if (!invoice) {
			return next(new ErrorHandler('Invoice not found', 404))
		}

		// If user is not admin, only allow access to their own invoices
		if (userRole !== UserRole.ADMIN && invoice.userId !== currentUserId) {
			return next(new ErrorHandler('Access denied', 403))
		}

		let browser: any = null
		try {
			// Generate HTML for invoice
			const html = generateInvoiceHTML(invoice)

			// Import puppeteer dynamically
			const puppeteer = await import('puppeteer')

			// Launch browser
			browser = await puppeteer.default.launch({
				headless: true,
				args: ['--no-sandbox', '--disable-setuid-sandbox'],
			})

			const page = await browser.newPage()

			// Set content and wait for it to load
			await page.setContent(html, { waitUntil: 'networkidle0' })

			// Generate PDF
			const pdf = await page.pdf({
				format: 'A4',
				printBackground: true,
				margin: {
					top: '20px',
					right: '20px',
					bottom: '20px',
					left: '20px',
				},
			})

			await browser.close()
			browser = null

			// Set headers for PDF response
			res.setHeader('Content-Type', 'application/pdf')
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
			)

			res.send(pdf)
		} catch (error: any) {
			console.error('PDF generation error:', error)
			// Ensure browser is closed even if an error occurs
			if (browser) {
				try {
					await browser.close()
				} catch (closeError: any) {
					console.error('Error closing browser:', closeError)
				}
			}
			return next(
				new ErrorHandler(
					`Failed to generate PDF: ${error.message}`,
					500,
				),
			)
		}
	},
)

// Helper function to generate invoice HTML
function generateInvoiceHTML(invoice: any): string {
	const formatDate = (date: Date | string) => {
		const d = new Date(date)
		return d.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		})
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount)
	}

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Invoice ${invoice.invoiceNumber}</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
			padding: 20px;
			background: #fff;
			color: #1f2937;
			font-size: 12px;
		}
		.invoice-container {
			max-width: 800px;
			margin: 0 auto;
			background: #fff;
		}
		.header {
			display: flex;
			justify-content: space-between;
			margin-bottom: 20px;
			padding-bottom: 12px;
			border-bottom: 2px solid #e5e7eb;
		}
		.header h1 {
			font-size: 22px;
			font-weight: 700;
			color: #1f2937;
		}
		.issuer-info {
			text-align: right;
			font-size: 11px;
			color: #6b7280;
		}
		.issuer-info p {
			margin: 2px 0;
		}
		.info-section {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 20px;
			margin-bottom: 20px;
		}
		.info-box h3 {
			font-size: 13px;
			font-weight: 600;
			margin-bottom: 6px;
			color: #1f2937;
		}
		.info-box p {
			font-size: 11px;
			color: #4b5563;
			margin: 2px 0;
			line-height: 1.3;
		}
		.orders-section {
			margin-bottom: 20px;
		}
		.orders-section h3 {
			font-size: 14px;
			font-weight: 600;
			margin-bottom: 10px;
			color: #1f2937;
		}
		.order-card {
			margin-bottom: 12px;
			padding: 10px;
			border: 1px solid #e5e7eb;
			border-radius: 4px;
			background: #f9fafb;
		}
		.order-card h4 {
			font-size: 12px;
			font-weight: 600;
			margin-bottom: 6px;
			color: #1f2937;
		}
		.order-info {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 12px;
			font-size: 10px;
			margin-bottom: 8px;
		}
		.order-info p {
			margin: 2px 0;
		}
		.order-dims {
			margin-top: 6px;
			padding-top: 6px;
			border-top: 1px solid #e5e7eb;
		}
		.order-dims-title {
			font-weight: 600;
			font-size: 10px;
			margin-bottom: 4px;
		}
		.order-dims-grid {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 8px;
			font-size: 10px;
		}
		.order-dims-details {
			margin-top: 4px;
			font-size: 10px;
		}
		.order-dims-details p {
			margin: 1px 0;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
		}
		th {
			background-color: #f9fafb;
			padding: 6px 8px;
			text-align: left;
			font-weight: 600;
			font-size: 11px;
			color: #1f2937;
			border-bottom: 2px solid #e5e7eb;
		}
		td {
			padding: 6px 8px;
			border-bottom: 1px solid #e5e7eb;
			font-size: 11px;
			color: #4b5563;
		}
		.text-right {
			text-align: right;
		}
		.total-row {
			font-weight: 700;
			font-size: 14px;
			background-color: #f9fafb;
		}
		.footer {
			margin-top: 20px;
			padding-top: 12px;
			border-top: 2px solid #e5e7eb;
			text-align: center;
			font-size: 10px;
			color: #6b7280;
		}
		@media print {
			body { padding: 15px; }
		}
	</style>
</head>
<body>
	<div class="invoice-container">
		<div class="header">
			<div>
				<h1>Invoice #${invoice.invoiceNumber}</h1>
				<p style="margin-top: 4px; color: #6b7280; font-size: 11px;">
					Date: ${formatDate(invoice.createdAt)}
				</p>
			</div>
			<div class="issuer-info">
				<p><strong>Seven Summits Consulting, LLC</strong></p>
				<p>55 W Monroe St, Suite 3330</p>
				<p>Chicago, IL 60603</p>
			</div>
		</div>

		<div class="info-section">
			<div class="info-box">
				<h3>Bill To:</h3>
				<p><strong>${invoice.companyInfo.name}</strong></p>
				${invoice.companyInfo.dba ? `<p>DBA: ${invoice.companyInfo.dba}</p>` : ''}
				<p>${invoice.companyInfo.address}</p>
				<p>${invoice.companyInfo.city}, ${invoice.companyInfo.state} ${invoice.companyInfo.zip}</p>
				<p>Phone: ${invoice.companyInfo.phone}</p>
				${invoice.companyInfo.fax ? `<p>Fax: ${invoice.companyInfo.fax}</p>` : ''}
				<p>Email: ${invoice.companyInfo.email}</p>
			</div>
			<div class="info-box">
				<h3>Invoice Period:</h3>
				<p><strong>From:</strong> ${formatDate(invoice.startDate)}</p>
				<p><strong>To:</strong> ${formatDate(invoice.endDate)}</p>
			</div>
		</div>

		${
			invoice.orders && invoice.orders.length > 0
				? `
		<div class="orders-section">
			<h3>Loads</h3>
			${invoice.orders
				.map(
					(order: any, index: number) => `
				<div class="order-card">
					<h4>Order #${order.orderNumber}</h4>
					<div class="order-info">
						<div>
							<p><strong>Truck #:</strong> ${order.truckNumber || 'N/A'}</p>
							<p><strong>Trailer #:</strong> ${order.trailerNumber || 'N/A'}</p>
							<p><strong>Contact:</strong> ${order.contact}</p>
							<p><strong>Commodity:</strong> ${order.commodity}</p>
						</div>
						<div>
							<p><strong>From:</strong> ${order.originAddress}</p>
							<p><strong>To:</strong> ${order.destinationAddress}</p>
							<p><strong>Start Date:</strong> ${formatDate(order.permitStartDate)}</p>
						</div>
					</div>
					<div class="order-dims">
						<p class="order-dims-title">Load Dimensions:</p>
						<div class="order-dims-grid">
							<p><strong>Length:</strong> ${order.lengthFt}ft ${order.lengthIn}in</p>
							<p><strong>Width:</strong> ${order.widthFt}ft ${order.widthIn}in</p>
							<p><strong>Height:</strong> ${order.heightFt}ft ${order.heightIn}in</p>
							<p><strong>ROH:</strong> ${order.rearOverhangFt}ft ${order.rearOverhangIn}in</p>
						</div>
						<div class="order-dims-details">
							${order.makeModel ? `<p><strong>Make/Model:</strong> ${order.makeModel}</p>` : ''}
							${order.serial ? `<p><strong>Serial Number:</strong> ${order.serial}</p>` : ''}
							${order.singleMultiple ? `<p><strong>Single/Multiple pcs:</strong> ${order.singleMultiple}</p>` : ''}
							<p><strong>Weight is:</strong> ${order.legalWeight === 'yes' ? 'legal' : 'overweight'}</p>
						</div>
					</div>
				</div>
			`,
				)
				.join('')}
		</div>
		`
				: ''
		}

		<table>
			<thead>
				<tr>
					<th>State</th>
					<th class="text-right">Oversize</th>
					<th class="text-right">Overweight</th>
					<th class="text-right">Superload</th>
					<th class="text-right">Service Fee</th>
					<th class="text-right">Escort</th>
					<th class="text-right">Total</th>
				</tr>
			</thead>
			<tbody>
				${invoice.charges
					.map(
						(charge: any) => `
					<tr>
						<td>${charge.state}</td>
						<td class="text-right">${formatCurrency(charge.oversize || 0)}</td>
						<td class="text-right">${formatCurrency(charge.overweight || 0)}</td>
						<td class="text-right">${formatCurrency(charge.superload || 0)}</td>
						<td class="text-right">${formatCurrency(charge.serviceFee || 0)}</td>
						<td class="text-right">${formatCurrency(charge.escort || 0)}</td>
						<td class="text-right"><strong>${formatCurrency(charge.total || 0)}</strong></td>
					</tr>
				`,
					)
					.join('')}
			</tbody>
			<tfoot>
				<tr class="total-row">
					<td colspan="6" class="text-right"><strong>Grand Total:</strong></td>
					<td class="text-right">${formatCurrency(invoice.totalAmount)}</td>
				</tr>
			</tfoot>
		</table>

		<div class="footer">
			<p>Thank you for your business!</p>
			<p style="margin-top: 8px;">Click Permit Management System</p>
		</div>
	</div>
</body>
</html>
	`
}
