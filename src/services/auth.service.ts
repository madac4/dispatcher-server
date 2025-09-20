import transporter from '../config/nodemailer'
import User from '../models/user.model'
import { UserRole } from '../types/auth.types'
import { SuccessResponse } from '../types/response.types'
import { ErrorHandler } from '../utils/ErrorHandler'
import renderEmail from '../utils/renderEmail'

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
		return SuccessResponse(null, 'User registered successfully')
	},

	async registerModerator(email: string, password: string) {
		const newUser = new User({ email, password, role: UserRole.MODERATOR })
		await newUser.save()

		if (newUser.role === UserRole.MODERATOR) {
			try {
				const html = await renderEmail('moderatorRegistrationEmail', {
					email,
					password,
					role: UserRole.MODERATOR,
					frontendOrigin: process.env.FRONTEND_ORIGIN,
				})
				await transporter.sendMail({
					from: `Dhruv <${process.env.EMAIL_USER}>`,
					to: email,
					subject: 'Moderator Registration',
					html,
				})
			} catch (error) {
				await newUser.deleteOne()
				throw new ErrorHandler(
					'Failed to send moderator registration email',
					500,
				)
			}
		}
	},

	async registerAdmin(email: string, password: string) {
		const newUser = new User({ email, password, role: UserRole.ADMIN })
		await newUser.save()

		return SuccessResponse(newUser, 'Admin registered successfully')
	},
}
