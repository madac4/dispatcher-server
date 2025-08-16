import { Document, model, Schema } from 'mongoose'

interface IRefreshToken extends Document {
	token: string
	userId: string
	expiresAt: Date
	createdAt: Date
}

const refreshTokenSchema: Schema = new Schema<IRefreshToken>({
	token: { type: String, required: true, unique: true },
	userId: { type: String, required: true, index: true },
	expiresAt: { type: Date, required: true, index: { expires: '7d' } },
	createdAt: { type: Date, default: Date.now },
})

export default model<IRefreshToken>('RefreshToken', refreshTokenSchema)
