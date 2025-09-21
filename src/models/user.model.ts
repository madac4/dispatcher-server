import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { model, Schema } from 'mongoose'
import { IUser, UserRole } from '../types/auth.types'

const userSchema: Schema = new Schema<IUser>({
	email: {
		type: String,
		required: true,
		unique: true,
		index: true,
		lowercase: true,
		validate: {
			validator: function (email: string) {
				return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(
					email,
				)
			},
			message: (props: any) => `${props.value} is not a valid email`,
		},
	},
	password: {
		type: String,
		select: false,
		required: [true, 'Password is required'],
		validate: [
			{
				validator: function (password: string) {
					return password.length >= 8
				},
				message: 'Password must be at least 8 characters long',
			},
			{
				validator: function (password: string) {
					return /[A-Z]/.test(password)
				},
				message: 'Password must contain at least one uppercase letter',
			},
			{
				validator: function (password: string) {
					return /[a-z]/.test(password)
				},
				message: 'Password must contain at least one lowercase letter',
			},
			{
				validator: function (password: string) {
					return /\d/.test(password)
				},
				message: 'Password must contain at least one number',
			},
			{
				validator: function (password: string) {
					return /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(
						password,
					)
				},
				message:
					'Password must contain at least one special character (@$!%*?&)',
			},
		],
	},
	role: {
		type: String,
		enum: UserRole,
		default: UserRole.USER,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	settingsId: { type: String, ref: 'UserSettings' },
})

userSchema.pre<IUser>('save', async function (next) {
	if (!this.isModified('password')) next()
	this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.comparePassword = async function (
	enteredPassword: string,
): Promise<boolean> {
	return await bcrypt.compare(enteredPassword, this.password)
}

userSchema.methods.signAccessToken = function (): string {
	return jwt.sign(
		{ userId: this._id, role: this.role, email: this.email, id: this._id },
		process.env.JWT_SECRET as string,
		{
			expiresIn: '1h',
		},
	)
}

userSchema.methods.signRefreshToken = function (): string {
	return jwt.sign(
		{ userId: this._id, role: this.role, email: this.email, id: this._id },
		process.env.JWT_SECRET as string,
		{
			expiresIn: '7d',
		},
	)
}

const User = model<IUser>('User', userSchema)
export default User
