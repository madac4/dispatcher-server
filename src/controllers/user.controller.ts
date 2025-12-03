import { NextFunction, Request, Response } from 'express'
import Settings from '../models/settings.model'
import User from '../models/user.model'
import { UserRole } from '../types/auth.types'
import {
	CreatePaginationMeta,
	PaginationMeta,
	PaginationQuery,
	SuccessResponse,
} from '../types/response.types'
import { CatchAsyncErrors } from '../utils/ErrorHandler'

export const getUsers = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const users = await User.find({ role: UserRole.USER })

		res.status(200).json(
			SuccessResponse(users, 'Users fetched successfully'),
		)
	},
)

export const getAllUsersWithSettings = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const query = req.query as unknown as PaginationQuery
		const page = Number(query.page) || 1
		const limit = Number(query.limit) || 20
		const roleFilter = query.role as UserRole | undefined
		const search = (query.search as string) || ''

		// Build filter
		const filter: any = {
			role: { $in: [UserRole.USER, UserRole.MODERATOR] },
		}

		// Apply role filter if specified
		if (
			roleFilter &&
			(roleFilter === UserRole.USER || roleFilter === UserRole.MODERATOR)
		) {
			filter.role = roleFilter
		}

		// Apply search filter if provided
		if (search) {
			filter.$or = [{ email: { $regex: search, $options: 'i' } }]
		}

		// Get total count
		const total = await User.countDocuments(filter)

		// Fetch users and moderators with pagination
		const skip = (page - 1) * limit
		const users = await User.find(filter)
			.select('_id email role isEmailConfirmed createdAt')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean()

		// Fetch settings for all users
		const userIds = users.map(user => user._id.toString())
		const settingsMap = new Map()

		if (userIds.length > 0) {
			const settings = await Settings.find({
				userId: { $in: userIds },
			})
				.select('userId companyInfo')
				.lean()

			settings.forEach(setting => {
				settingsMap.set(setting.userId, setting.companyInfo)
			})
		}

		// Combine user data with settings
		const usersWithSettings = users.map(user => {
			const userId = user._id.toString()
			const companyInfo = settingsMap.get(userId) || null

			return {
				id: userId,
				email: user.email,
				role: user.role,
				isEmailConfirmed: user.isEmailConfirmed,
				createdAt: user.createdAt,
				companyInfo: companyInfo
					? {
							name: companyInfo.name || null,
							phone: companyInfo.phone || null,
							email: companyInfo.email || null,
						}
					: null,
			}
		})

		// Separate users and moderators
		const regularUsers = usersWithSettings.filter(
			user => user.role === UserRole.USER,
		)
		const moderators = usersWithSettings.filter(
			user => user.role === UserRole.MODERATOR,
		)

		// Create pagination meta
		const meta: PaginationMeta = CreatePaginationMeta(total, page, limit)

		// Return as paginated response with the object wrapped
		res.status(200).json({
			status: 200,
			success: true,
			message: 'Users and moderators fetched successfully',
			data: {
				users: regularUsers,
				moderators: moderators,
			},
			meta,
		})
	},
)
