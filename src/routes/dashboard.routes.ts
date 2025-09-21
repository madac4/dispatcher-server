import { Router } from 'express'
import { getAdminDashboardCards } from '../controllers/dashboard.controller'
import { authMiddleware } from '../middleware/authMiddleware'
import { rolesMiddleware } from '../middleware/rolesMiddleware'
import { UserRole } from '../types/auth.types'

const DashboardRoutes: Router = Router()

DashboardRoutes.post(
	'/cards',
	authMiddleware,
	rolesMiddleware([UserRole.ADMIN]),
	getAdminDashboardCards,
)

export default DashboardRoutes
