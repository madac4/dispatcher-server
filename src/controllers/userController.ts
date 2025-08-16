import { NextFunction, Request, Response } from 'express'
import User from '../models/user.model'
import { ChangePasswordRequest } from '../types/user'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'
import { SuccessResponse } from '../types/response.types'

export const changePassword = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { oldPassword, newPassword, confirmPassword }: ChangePasswordRequest = req.body

  if (!oldPassword || !newPassword || !confirmPassword) {
    return next(new ErrorHandler('All fields are required', 400))
  }

  if (newPassword !== confirmPassword) {
    return next(new ErrorHandler('Passwords do not match', 400))
  }

  const user = await User.findById(req.user.userId).select('+password')
  if (!user) {
    return next(new ErrorHandler('User not found', 404))
  }

  const isMatch = await user.comparePassword(oldPassword)
  if (!isMatch) {
    return next(new ErrorHandler('Invalid old password', 400))
  }

  user.password = newPassword
  await user.save()

  res.status(200).json(SuccessResponse('Password changed successfully'))
})
