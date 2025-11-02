import { NextFunction, Request, Response } from 'express'
import User from '../models/user.model'
import { UserRole } from '../types/auth.types'
import { SuccessResponse } from '../types/response.types'
import { CatchAsyncErrors } from '../utils/ErrorHandler'

export const getUsers = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const users = await User.find({ role: UserRole.USER })

		res.status(200).json(
			SuccessResponse(users, 'Users fetched successfully'),
		)
	},
)
