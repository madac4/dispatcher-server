import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import transporter from '../config/nodemailer';
import { decodeToken } from '../middleware/authMiddleware';
import RefreshToken from '../models/refresh-token.model';
import ResetToken from '../models/reset-token.model';
import User from '../models/user.model';
import {
  ForgotPasswordRequest,
  JwtDTO,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserRole,
} from '../types/auth.types';
import { SuccessResponse } from '../types/response.types';
import { ChangePasswordRequest } from '../types/user';
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler';
import renderEmail from '../utils/renderEmail';
import { validatePassword } from '../utils/validators';

export const register = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, role }: RegisterRequest = req.body;
    const user = decodeToken(req) as JwtDTO;

    // if (!inviteCode) {
    // 	return next(new ErrorHandler('Invite code is required', 400))
    // }

    if (!email || !password) {
      return next(new ErrorHandler('Email and password are required', 400));
    }

    // const emailInvitation = await Invitation.findOne({
    // 	email,
    // })

    // if (!emailInvitation) {
    // 	return next(
    // 		new ErrorHandler(
    // 			'You do not have an invitation on this email',
    // 			400,
    // 		),
    // 	)
    // }

    // const invitation = await Invitation.findOne({
    // 	code: inviteCode,
    // 	email,
    // 	used: false,
    // })

    // if (!invitation)
    // 	return next(new ErrorHandler('Invalid or expired invite code', 400))

    // if (invitation.expiresAt < new Date()) {
    // 	return next(new ErrorHandler('Invite code has expired', 400))
    // }

    const existingUser = await User.findOne({ email });

    if (existingUser) return next(new ErrorHandler('User already exists', 400));

    if (user.role !== UserRole.ADMIN && role === UserRole.MODERATOR) {
      return next(new ErrorHandler('You are not authorized to register a moderator', 403));
    }

    const newUser = new User({
      email,
      password,
      role: role || UserRole.USER,
    });
    await newUser.save();

    if (newUser.role === UserRole.MODERATOR) {
      try {
        const html = await renderEmail('moderatorRegistrationEmail', {
          email,
          password,
          role,
          frontendOrigin: process.env.FRONTEND_ORIGIN,
        });
        await transporter.sendMail({
          from: `Dhruv <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Moderator Registration',
          html,
        });
      } catch (error) {
        await newUser.deleteOne();
        return next(new ErrorHandler('Failed to send moderator registration email', 500));
      }
    }

    // await Team.findByIdAndUpdate(invitation.teamId, {
    // 	$addToSet: { members: user._id },
    // })

    // invitation.used = true
    // await invitation.save()

    res
      .status(201)
      .json(
        SuccessResponse(
          null,
          `User registered successfully ${role !== UserRole.USER ? 'with role ' + role : ''}`
        )
      );
  }
);

export const login = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password }: LoginRequest = req.body;

  if (!email || !password) return next(new ErrorHandler('Email and password are required', 400));

  if (!validatePassword(password)) {
    return next(
      new ErrorHandler(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, one special character and be at least 8 characters long',
        400
      )
    );
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) return next(new ErrorHandler('You do not have an account, please register', 400));

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return next(new ErrorHandler('Invalid email or password', 400));

  const accessToken = user.signAccessToken();
  const refreshToken = user.signRefreshToken();

  const refreshTokenDoc = new RefreshToken({
    token: refreshToken,
    userId: user._id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await refreshTokenDoc.save();

  res
    .status(200)
    .json(SuccessResponse<LoginResponse>({ accessToken, refreshToken }, 'Login successful'));
});

export const refreshToken = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) return next(new ErrorHandler('Refresh token is required', 400));

    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });

    if (!tokenDoc) return next(new ErrorHandler('Invalid refresh token', 400));

    if (tokenDoc.expiresAt < new Date()) {
      await tokenDoc.deleteOne();
      return next(new ErrorHandler('Refresh token expired', 400));
    }

    let decoded: { userId: string; role: UserRole };

    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as {
        userId: string;
        role: UserRole;
      };
    } catch (error) {
      await tokenDoc.deleteOne();
      return next(new ErrorHandler('Invalid refresh token', 400));
    }

    const user = await User.findById(decoded.userId);

    if (!user) return next(new ErrorHandler('User not found', 404));

    const accessToken = user.signAccessToken();

    res
      .status(200)
      .json(SuccessResponse<{ accessToken: string }>({ accessToken }, 'Refresh token successful'));
  }
);

export const forgotPassword = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email }: ForgotPasswordRequest = req.body;

    if (!email) return next(new ErrorHandler('Email is required', 400));

    const user = await User.findOne({ email });
    if (!user) return next(new ErrorHandler('User not found', 404));

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenDoc = new ResetToken({
      token: resetToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await resetTokenDoc.save();

    try {
      const html = await renderEmail('forgotPasswordEmail', {
        resetToken,
        frontendOrigin: process.env.FRONTEND_ORIGIN,
      });
      await transporter.sendMail({
        from: `Dhruv <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Reset Your Dhruv Password',
        html,
      });
    } catch (error) {
      await resetTokenDoc.deleteOne();
      return next(new ErrorHandler('Failed to send reset email', 500));
    }

    res.status(200).json(SuccessResponse(null, `Password reset email sent to ${email}`));
  }
);

export const resetPassword = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, password, confirmPassword }: ResetPasswordRequest = req.body;

    if (!token || !password || !confirmPassword)
      return next(new ErrorHandler('All fields are required', 400));
    if (password.length < 8)
      return next(new ErrorHandler('Password must be at least 8 characters long', 400));
    if (password !== confirmPassword) return next(new ErrorHandler('Passwords do not match', 400));

    const resetTokenDoc = await ResetToken.findOne({ token });
    if (!resetTokenDoc) return next(new ErrorHandler('Invalid or expired token', 400));
    if (resetTokenDoc.expiresAt < new Date()) return next(new ErrorHandler('Token expired', 400));

    const user = await User.findById(resetTokenDoc.userId).select('+password');
    if (!user) return next(new ErrorHandler('User not found', 404));

    const isMatch = await user.comparePassword(password);
    if (isMatch)
      return next(new ErrorHandler('New password cannot be the same as the old password', 400));

    user.password = password;
    await user.save();

    await resetTokenDoc.deleteOne();

    res.status(200).json(SuccessResponse(null, 'Password reset successful'));
  }
);

export const updatePassword = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId }: { userId: string } = req.user;
    const { currentPassword, password, confirmPassword }: ChangePasswordRequest = req.body;

    if (!currentPassword || !password || !confirmPassword)
      return next(new ErrorHandler('All fields are required', 400));
    if (password !== confirmPassword) return next(new ErrorHandler('Passwords do not match', 400));

    const user = await User.findById(userId).select('+password');
    if (!user) return next(new ErrorHandler('User not found', 404));

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return next(new ErrorHandler('Invalid current password', 400));

    const isSamePassword = await user.comparePassword(password);
    if (isSamePassword)
      return next(new ErrorHandler('New password cannot be the same as the old password', 400));

    user.password = password;
    await user.save();

    res.status(200).json(SuccessResponse(null, 'Password changed successfully'));
  }
);

export const logout = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { userId }: { userId: string } = req.user;

  if (!userId) return next(new ErrorHandler('User ID is required', 400));

  const tokenDocs = await RefreshToken.find({ userId });
  if (!tokenDocs.length) return next(new ErrorHandler('No refresh tokens found', 401));

  await RefreshToken.deleteMany({ userId });

  res.status(200).json(SuccessResponse(null, 'Logout successful'));
});
