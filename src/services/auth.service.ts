import crypto from 'crypto'
import transporter from '../config/nodemailer'
import EmailConfirmationToken from '../models/email-confirmation-token.model'
import User from '../models/user.model'
import { UserRole } from '../types/auth.types'
import { SuccessResponse } from '../types/response.types'
import { ErrorHandler } from '../utils/ErrorHandler'
import renderEmail from '../utils/renderEmail'
import { EmailService } from './email.service'

export const AuthService = {
	async validateRegisterRequest(email: string, password: string) {
		if (!email || !password) {
			throw new ErrorHandler('Email and password are required', 400)
		}

		const existingUser = await User.findOne({ email })

		if (existingUser) {
			throw new ErrorHandler('User already exists', 400)
		}
	},

	async registerUser(email: string, password: string) {
		const newUser = new User({ email, password })
		await newUser.save()

		const confirmationToken = crypto.randomBytes(32).toString('hex')
		const confirmationTokenDoc = new EmailConfirmationToken({
			token: confirmationToken,
			userId: newUser._id,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
		})
		await confirmationTokenDoc.save()

		try {
			await EmailService.sendEmail(
				'confirmRegistration',
				{
					confirmationToken,
					frontendOrigin: process.env.FRONTEND_ORIGIN,
				},
				email,
				'Confirm Your Click Permit Account',
			)
		} catch (error) {
			await newUser.deleteOne()
			await confirmationTokenDoc.deleteOne()
			throw new ErrorHandler('Failed to send confirmation email', 500)
		}

		return SuccessResponse(
			null,
			'User registered successfully. Please check your email to confirm your account.',
		)
	},

	async registerModerator(email: string, password: string) {
		const newUser = new User({ email, password, role: UserRole.MODERATOR })
		await newUser.save()

		if (newUser.role === UserRole.MODERATOR) {
			const emailData = {
				email,
				password,
				role: UserRole.MODERATOR,
				frontendOrigin: process.env.FRONTEND_ORIGIN,
			}

			await EmailService.sendEmail(
				'moderatorRegistrationEmail',
				emailData,
				email,
				'Moderator Registration',
			)
		}

		return SuccessResponse(newUser, 'Moderator registered successfully')
	},

	async registerAdmin(email: string, password: string) {
		const newUser = new User({ email, password, role: UserRole.ADMIN })
		await newUser.save()

		return SuccessResponse(newUser, 'Admin registered successfully')
	},

	async confirmEmail(token: string) {
		if (!token) {
			throw new ErrorHandler('Confirmation token is required', 400)
		}

		const confirmationTokenDoc = await EmailConfirmationToken.findOne({
			token,
		})
		if (!confirmationTokenDoc) {
			throw new ErrorHandler('Invalid or expired confirmation token', 400)
		}

		if (confirmationTokenDoc.expiresAt < new Date()) {
			await confirmationTokenDoc.deleteOne()
			await User.findById(confirmationTokenDoc.userId).deleteOne()
			throw new ErrorHandler('Confirmation token has expired', 400)
		}

		const user = await User.findById(confirmationTokenDoc.userId)
		if (!user) {
			await confirmationTokenDoc.deleteOne()
			await User.findById(confirmationTokenDoc.userId).deleteOne()
			throw new ErrorHandler('User not found', 404)
		}

		if (user.isEmailConfirmed) {
			await confirmationTokenDoc.deleteOne()
			throw new ErrorHandler('Email is already confirmed', 400)
		}

		user.isEmailConfirmed = true
		await user.save()
		await confirmationTokenDoc.deleteOne()

		return SuccessResponse(null, 'Email confirmed successfully')
	},

	async resendConfirmationEmail(email: string) {
		if (!email) {
			throw new ErrorHandler('Email is required', 400)
		}

		const user = await User.findOne({ email })
		if (!user) {
			throw new ErrorHandler('User not found', 404)
		}

		if (user.isEmailConfirmed) {
			throw new ErrorHandler('Email is already confirmed', 400)
		}

		await EmailConfirmationToken.deleteMany({ userId: user._id })

		const confirmationToken = crypto.randomBytes(32).toString('hex')
		const confirmationTokenDoc = new EmailConfirmationToken({
			token: confirmationToken,
			userId: user._id,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
		})
		await confirmationTokenDoc.save()

		try {
			const html = await renderEmail('confirmRegistration', {
				confirmationToken,
				frontendOrigin: process.env.FRONTEND_ORIGIN,
			})
			await transporter.sendMail({
				from: `Click Permit <${process.env.ADMIN_EMAIL}>`,
				to: email,
				subject: 'Confirm Your Click Permit Account',
				html,
			})
		} catch (error) {
			await confirmationTokenDoc.deleteOne()
			throw new ErrorHandler('Failed to send confirmation email', 500)
		}

		return SuccessResponse(null, 'Confirmation email sent successfully')
	},

	async updatePassword(
		userId: string,
		currentPassword: string,
		password: string,
	) {
		const user = await User.findById(userId).select('+password')
		if (!user) throw new ErrorHandler('User not found', 404)

		const isMatch = await user.comparePassword(currentPassword)
		if (!isMatch) throw new ErrorHandler('Invalid current password', 400)

		const isSamePassword = await user.comparePassword(password)

		if (isSamePassword) {
			throw new ErrorHandler(
				'New password cannot be the same as the old password',
				400,
			)
		}
		user.password = password
		await user.save()

		await EmailService.sendEmail(
			'passwordChangedEmail',
			{},
			user.email,
			'Password Changed',
		)

		return SuccessResponse(null, 'Password changed successfully')
	},
}
