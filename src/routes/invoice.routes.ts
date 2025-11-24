import { Router } from 'express'
import {
	createInvoice,
	deleteInvoice,
	downloadInvoice,
	getInvoiceById,
	getInvoices,
	getUsersForInvoice,
	sendInvoiceEmail,
	updateInvoice,
} from '../controllers/invoice.controller'
import { authMiddleware } from '../middleware/authMiddleware'
import { rolesMiddleware } from '../middleware/rolesMiddleware'
import { UserRole } from '../types/auth.types'

const InvoiceRoutes: Router = Router()

InvoiceRoutes.get(
	'/users',
	authMiddleware,
	rolesMiddleware([UserRole.ADMIN]),
	getUsersForInvoice,
)

InvoiceRoutes.get('/', authMiddleware, getInvoices)
InvoiceRoutes.get('/:id', authMiddleware, getInvoiceById)
InvoiceRoutes.post(
	'/',
	authMiddleware,
	rolesMiddleware([UserRole.ADMIN]),
	createInvoice,
)
InvoiceRoutes.put(
	'/:id',
	authMiddleware,
	rolesMiddleware([UserRole.ADMIN]),
	updateInvoice,
)
InvoiceRoutes.delete(
	'/:id',
	authMiddleware,
	rolesMiddleware([UserRole.ADMIN]),
	deleteInvoice,
)
InvoiceRoutes.post(
	'/:id/send-email',
	authMiddleware,
	rolesMiddleware([UserRole.ADMIN]),
	sendInvoiceEmail,
)

InvoiceRoutes.get('/:id/download', authMiddleware, downloadInvoice)

export default InvoiceRoutes
