import { Document, model, Schema } from 'mongoose'

interface IEmailConfirmationToken extends Document {
	token: string
	userId: string
	expiresAt: Date
	createdAt: Date
}

const emailConfirmationTokenSchema: Schema =
	new Schema<IEmailConfirmationToken>({
		token: { type: String, required: true, unique: true },
		userId: { type: String, required: true, index: true },
		expiresAt: { type: Date, required: true, index: { expires: '24h' } },
		createdAt: { type: Date, default: Date.now },
	})

export default model<IEmailConfirmationToken>(
	'EmailConfirmationToken',
	emailConfirmationTokenSchema,
)
