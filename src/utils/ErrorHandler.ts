import { NextFunction, Request, Response } from 'express'
import { ErrorResponse } from '../types/response.types'

export class ErrorHandler extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    Error.captureStackTrace(this, this.constructor)
  }
}

export const CatchAsyncErrors = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  const statusCode = err instanceof ErrorHandler ? err.statusCode : 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json(ErrorResponse(message, statusCode))
}
