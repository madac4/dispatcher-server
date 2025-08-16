import { Document, model, Schema } from 'mongoose'

interface IResetToken extends Document {
	token: string
	userId: string
	expiresAt: Date
	createdAt: Date
}

const resetTokenSchema: Schema = new Schema<IResetToken>({
	token: { type: String, required: true, unique: true },
	userId: { type: String, required: true, index: true },
	expiresAt: { type: Date, required: true, index: { expires: '1h' } },
	createdAt: { type: Date, default: Date.now },
})

export default model<IResetToken>('ResetToken', resetTokenSchema)
