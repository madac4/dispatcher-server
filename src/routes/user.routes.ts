import { Router } from 'express'
import { getAllUsersWithSettings, getUsers } from '../controllers/user.controller'
import { authMiddleware } from '../middleware/authMiddleware'
import { rolesMiddleware } from '../middleware/rolesMiddleware'
import { UserRole } from '../types/auth.types'

const router = Router()

// Get all users and moderators with settings (admin only)
router.get(
	'/all',
	authMiddleware,
	rolesMiddleware([UserRole.ADMIN]),
	getAllUsersWithSettings,
)

// Get regular users only (existing endpoint)
router.get('/', authMiddleware, getUsers)

export default router

