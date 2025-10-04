import { Router } from 'express'
import {
	confirmEmail,
	forgotPassword,
	login,
	logout,
	refreshToken,
	register,
	resendConfirmationEmail,
	resetPassword,
	updatePassword,
} from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/authMiddleware'

const AuthRoutes: Router = Router()

AuthRoutes.post('/login', login)
AuthRoutes.post('/register', register)
AuthRoutes.post('/confirm-email', confirmEmail)
AuthRoutes.post('/resend-confirmation', resendConfirmationEmail)
AuthRoutes.post('/refresh-token', refreshToken)
AuthRoutes.post('/reset-password', resetPassword)
AuthRoutes.post('/logout', authMiddleware, logout)
AuthRoutes.post('/forgot-password', forgotPassword)
AuthRoutes.post('/update-password', authMiddleware, updatePassword)

export default AuthRoutes
