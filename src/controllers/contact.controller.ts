import { NextFunction, Request, Response } from 'express'
import { ContactFormDTO } from '../dto/contact.dto'
import { EmailService } from '../services/email.service'
import { SuccessResponse } from '../types/response.types'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'
import { validateEmail } from '../utils/validators'

export const sendContactForm = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const {
			firstName,
			lastName,
			email,
			phone,
			subject,
			company,
			message,
		}: ContactFormDTO = req.body

		if (!firstName || !lastName) {
			return next(
				new ErrorHandler('First name and last name are required', 400),
			)
		}

		if (!email) {
			return next(new ErrorHandler('Email is required', 400))
		}

		if (!phone) {
			return next(new ErrorHandler('Phone is required', 400))
		}

		if (!subject) {
			return next(new ErrorHandler('Subject is required', 400))
		}

		if (!validateEmail(email)) {
			return next(new ErrorHandler('Invalid email', 400))
		}

		if (!message) {
			return next(new ErrorHandler('Message is required', 400))
		}

		try {
			const emailData = {
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: email.trim().toLowerCase(),
				phone: phone ? phone.trim() : null,
				subject: subject.trim(),
				company: company ? company.trim() : null,
				message: message.trim(),
			}

			if (!process.env.ADMIN_EMAIL) {
				return next(
					new ErrorHandler('Email configuration not found', 500),
				)
			}

			await EmailService.sendEmail(
				'contactFormEmail',
				emailData,
				process.env.ADMIN_EMAIL,
				`New Contact Form Submission: ${emailData.subject}`,
			)

			if (process.env.SEND_CONFIRMATION_EMAIL === 'true') {
				const confirmationData = {
					firstName: emailData.firstName,
					subject: emailData.subject,
					submissionDate: new Date().toLocaleDateString('en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric',
					}),
				}

				await EmailService.sendEmail(
					'contactConfirmationEmail',
					confirmationData,
					emailData.email,
					'Thank you for contacting Click Permit',
				)
			}

			res.status(200).json(
				SuccessResponse(null, 'Contact form submitted successfully'),
			)
		} catch (error) {
			console.error('Contact form submission error:', error)
			return next(
				new ErrorHandler(
					'Failed to submit contact form. Please try again later.',
					500,
				),
			)
		}
	},
)
