import dotenv from 'dotenv'
import nodemailer, { Transporter } from 'nodemailer'

dotenv.config()

const transporter: Transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT || '587'),
	service: process.env.SMTP_SERVICE,
	auth: {
		user: process.env.SMTP_MAIL,
		pass: process.env.SMTP_PASSWORD,
	},
})

export default transporter
