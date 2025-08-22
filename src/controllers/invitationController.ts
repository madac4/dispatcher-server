import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import transporter from '../config/nodemailer'
import Invitation from '../models/invitation.model'
import Team from '../models/team.model'
import User from '../models/user.model'
import { UserRole } from '../types/auth.types'
import { InviteRequest } from '../types/invitation.types'
import { SuccessResponse } from '../types/response.types'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'
import renderEmail from '../utils/renderEmail'

export const createInvitation = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { email, role }: InviteRequest = req.body

		if (!email) {
			return next(new ErrorHandler('Email is required', 400))
		}

		const existingInvitation = await Invitation.findOne({
			email,
			used: false,
			expiresAt: {
				$gt: new Date(),
			},
		})

		if (existingInvitation) {
			return next(
				new ErrorHandler(
					'An active invitation already exists for this email',
					409,
				),
			)
		}

		const existingUser = await User.findOne({ email })
		if (existingUser) {
			return next(new ErrorHandler('User already exists', 409))
		}

		let team = await Team.findOne({ owner: req.user.userId })
		if (!team) {
			team = new Team({
				owner: req.user.userId,
				members: [],
			})
			await team.save()
		}

		const inviteCode = crypto.randomBytes(16).toString('hex')
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

		const invitation = new Invitation({
			code: inviteCode,
			email,
			role: role || UserRole.USER,
			expiresAt,
			teamId: team._id,
			invitedBy: req.user.userId,
		})

		await invitation.save()

		try {
			const html = await renderEmail('invitationEmail', {
				inviteCode,
				expiresAt,
				frontendOrigin: process.env.FRONTEND_ORIGIN,
			})

			await transporter.sendMail({
				from: `Dhruv <${process.env.EMAIL_USER}>`,
				to: email,
				subject: 'Dhruv Invitation',
				html,
			})
		} catch (error) {
			console.error('Error sending email:', error)
			await invitation.deleteOne()
			return next(
				new ErrorHandler('Failed to send invitation email', 500),
			)
		}

		res.status(201).json(
			SuccessResponse(null, `Invitation sent to ${email}`),
		)
	},
)

export const removeInvitation = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { inviteId } = req.params

		const invitation = await Invitation.findById(inviteId)

		if (!invitation) {
			return next(new ErrorHandler('Invitation not found', 404))
		}

		await invitation.deleteOne()

		res.status(200).json({
			message: 'Invitation removed successfully',
			invitation,
		})
	},
)
