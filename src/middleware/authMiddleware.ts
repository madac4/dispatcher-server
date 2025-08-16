import { NextFunction, Request, Response } from 'express'
import { ErrorHandler } from '../utils/ErrorHandler'
import jwt, { JwtPayload } from 'jsonwebtoken'

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
		) as JwtPayload
		req.user = decoded
		next()
	} catch (error) {
		return next(new ErrorHandler('Invalid token', 401))
	}
}
