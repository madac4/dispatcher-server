import transporter from '../config/nodemailer'
import { ErrorHandler } from '../utils/ErrorHandler'
import renderEmail from '../utils/renderEmail'

export const EmailService = {
	async sendEmail(template: string, data: any, to: string, subject: string) {
		try {
			const html = await renderEmail(template, data)

			await transporter.sendMail({
				from: `Click Permit <${process.env.ADMIN_EMAIL}>`,
				to: to,
				subject: subject,
				html,
			})
		} catch (error) {
			throw new ErrorHandler('Failed to send email', 500)
		}
	},
}
