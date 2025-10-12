import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import transporter from '../config/nodemailer'
import { decodeToken } from '../middleware/authMiddleware'
import RefreshToken from '../models/refresh-token.model'
import ResetToken from '../models/reset-token.model'
import User from '../models/user.model'
import { AuthService } from '../services/auth.service'
import {
	ConfirmEmailRequest,
	ForgotPasswordRequest,
	JwtDTO,
	LoginRequest,
	LoginResponse,
	RefreshTokenRequest,
	RegisterRequest,
	ResetPasswordRequest,
	UserRole,
} from '../types/auth.types'
import { SuccessResponse } from '../types/response.types'
import { ChangePasswordRequest } from '../types/user'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'
import renderEmail from '../utils/renderEmail'
import { validatePassword } from '../utils/validators'

export const register = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { email, password, role }: RegisterRequest = req.body
		const user = decodeToken(req) as JwtDTO

		let response = null

		if (user.role !== UserRole.ADMIN && role === UserRole.MODERATOR) {
			return next(
				new ErrorHandler(
					'You are not authorized to register a moderator',
					403,
				),
			)
		}

		if (!role || role === UserRole.USER) {
			await AuthService.validateRegisterRequest(email, password)
			response = await AuthService.registerUser(email, password)
		} else if (
			user.role === UserRole.ADMIN &&
			role === UserRole.MODERATOR
		) {
			await AuthService.validateRegisterRequest(email, password)
			response = await AuthService.registerModerator(email, password)
		}

		res.status(201).json(response)
	},
)

export const login = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { email, password }: LoginRequest = req.body

		if (!email || !password)
			return next(
				new ErrorHandler('Email and password are required', 400),
			)

		if (!validatePassword(password)) {
			return next(
				new ErrorHandler(
					'Password must contain at least one uppercase letter, one lowercase letter, one number, one special character and be at least 8 characters long',
					400,
				),
			)
		}

		const user = await User.findOne({ email }).select('+password')

		if (!user)
			return next(
				new ErrorHandler(
					'You do not have an account, please register',
					400,
				),
			)

		if (!user.isEmailConfirmed)
			return next(
				new ErrorHandler(
					'Please confirm your email address before logging in',
					400,
				),
			)

		const isMatch = await user.comparePassword(password)
		if (!isMatch)
			return next(new ErrorHandler('Invalid email or password', 400))

		const accessToken = user.signAccessToken()
		const refreshToken = user.signRefreshToken()

		const refreshTokenDoc = new RefreshToken({
			token: refreshToken,
			userId: user._id,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		})

		await refreshTokenDoc.save()

		res.status(200).json(
			SuccessResponse<LoginResponse>(
				{ accessToken, refreshToken },
				'Login successful',
			),
		)
	},
)

export const refreshToken = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { refreshToken }: RefreshTokenRequest = req.body

		if (!refreshToken)
			return next(new ErrorHandler('Refresh token is required', 400))

		const tokenDoc = await RefreshToken.findOne({ token: refreshToken })

		if (!tokenDoc)
			return next(new ErrorHandler('Invalid refresh token', 400))

		if (tokenDoc.expiresAt < new Date()) {
			await tokenDoc.deleteOne()
			return next(new ErrorHandler('Refresh token expired', 400))
		}

		let decoded: { userId: string; role: UserRole }

		try {
			decoded = jwt.verify(
				refreshToken,
				process.env.JWT_SECRET as string,
			) as {
				userId: string
				role: UserRole
			}
		} catch (error) {
			await tokenDoc.deleteOne()
			return next(new ErrorHandler('Invalid refresh token', 400))
		}

		const user = await User.findById(decoded.userId)

		if (!user) return next(new ErrorHandler('User not found', 404))

		const accessToken = user.signAccessToken()

		res.status(200).json(
			SuccessResponse<{ accessToken: string }>(
				{ accessToken },
				'Refresh token successful',
			),
		)
	},
)

export const forgotPassword = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { email }: ForgotPasswordRequest = req.body

		if (!email) return next(new ErrorHandler('Email is required', 400))

		const user = await User.findOne({ email })
		if (!user) return next(new ErrorHandler('User not found', 404))

		const resetToken = crypto.randomBytes(32).toString('hex')
		const resetTokenDoc = new ResetToken({
			token: resetToken,
			userId: user._id,
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
		})
		await resetTokenDoc.save()

		try {
			const html = await renderEmail('forgotPasswordEmail', {
				resetToken,
				frontendOrigin: process.env.FRONTEND_ORIGIN,
			})
			await transporter.sendMail({
				from: `Click Permit <${process.env.ADMIN_EMAIL}>`,
				to: email,
				subject: 'Reset Your Click Permit Password',
				html,
			})
		} catch (error) {
			await resetTokenDoc.deleteOne()
			return next(new ErrorHandler('Failed to send reset email', 500))
		}

		res.status(200).json(
			SuccessResponse(null, `Password reset email sent to ${email}`),
		)
	},
)

export const resetPassword = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { token, password, confirmPassword }: ResetPasswordRequest =
			req.body

		if (!token || !password || !confirmPassword)
			return next(new ErrorHandler('All fields are required', 400))
		if (password.length < 8)
			return next(
				new ErrorHandler(
					'Password must be at least 8 characters long',
					400,
				),
			)
		if (password !== confirmPassword)
			return next(new ErrorHandler('Passwords do not match', 400))

		const resetTokenDoc = await ResetToken.findOne({ token })
		if (!resetTokenDoc)
			return next(new ErrorHandler('Invalid or expired token', 400))
		if (resetTokenDoc.expiresAt < new Date())
			return next(new ErrorHandler('Token expired', 400))

		const user = await User.findById(resetTokenDoc.userId).select(
			'+password',
		)
		if (!user) return next(new ErrorHandler('User not found', 404))

		const isMatch = await user.comparePassword(password)
		if (isMatch)
			return next(
				new ErrorHandler(
					'New password cannot be the same as the old password',
					400,
				),
			)

		user.password = password
		await user.save()

		await resetTokenDoc.deleteOne()

		res.status(200).json(SuccessResponse(null, 'Password reset successful'))
	},
)

export const updatePassword = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { userId } = req.user
		const {
			currentPassword,
			password,
			confirmPassword,
		}: ChangePasswordRequest = req.body

		if (!currentPassword || !password || !confirmPassword)
			return next(new ErrorHandler('All fields are required', 400))

		if (password !== confirmPassword)
			return next(new ErrorHandler('Passwords do not match', 400))

		const response = await AuthService.updatePassword(
			userId,
			currentPassword,
			password,
		)

		res.status(200).json(response)
	},
)

export const logout = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { userId }: { userId: string } = req.user

		if (!userId) return next(new ErrorHandler('User ID is required', 400))

		const tokenDocs = await RefreshToken.find({ userId })
		if (!tokenDocs.length)
			return next(new ErrorHandler('No refresh tokens found', 401))

		await RefreshToken.deleteMany({ userId })

		res.status(200).json(SuccessResponse(null, 'Logout successful'))
	},
)

export const confirmEmail = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { token }: ConfirmEmailRequest = req.body

		if (!token) return next(new ErrorHandler('Token is required', 400))

		const response = await AuthService.confirmEmail(token)

		res.status(200).json(response)
	},
)

export const resendConfirmationEmail = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { email }: { email: string } = req.body

		if (!email) return next(new ErrorHandler('Email is required', 400))

		const response = await AuthService.resendConfirmationEmail(email)

		res.status(200).json(response)
	},
)
