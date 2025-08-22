import { Router } from 'express'
import {
	forgotPassword,
	login,
	logout,
	refreshToken,
	register,
	resetPassword,
	updatePassword,
} from '../controllers/authController'
import { authMiddleware } from '../middleware/authMiddleware'

const AuthRoutes: Router = Router()

AuthRoutes.post('/login', login)
AuthRoutes.post('/register', register)
AuthRoutes.post('/refresh-token', refreshToken)
AuthRoutes.post('/reset-password', resetPassword)
AuthRoutes.post('/logout', authMiddleware, logout)
AuthRoutes.post('/forgot-password', forgotPassword)
AuthRoutes.post('/update-password', authMiddleware, updatePassword)

export default AuthRoutes
