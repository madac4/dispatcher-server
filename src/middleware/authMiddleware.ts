import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { ErrorHandler } from '../utils/ErrorHandler'

interface JwtUserPayload {
	userId: string
	role: string
	iat?: number
	exp?: number
}

export const authMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.headers.authorization?.split(' ')[1]

	if (!token) {
		return next(new ErrorHandler('No token provided', 401))
	}

	try {
		const decoded = jwt.verify(
			token,
			process.env.JWT_SECRET as string,
		) as JwtUserPayload

		// Ensure the decoded payload has the required properties
		if (!decoded.userId || !decoded.role) {
			return next(new ErrorHandler('Invalid token payload', 401))
		}

		req.user = decoded
		next()
	} catch (error) {
		return next(new ErrorHandler('Invalid token', 401))
	}
}
