import { model, Schema } from 'mongoose'
import { IUserSettings } from '../types/settings.types'

const settingsSchema: Schema = new Schema<IUserSettings>({
	userId: { type: String, required: true, unique: true, index: true },
	companyInfo: {
		name: { type: String, trim: true, required: true },
		dba: { type: String, trim: true },
		address: { type: String, trim: true, required: true },
		city: { type: String, trim: true, required: true },
		state: { type: String, trim: true, required: true },
		zip: { type: String, trim: true, required: true },
		phone: { type: String, trim: true, required: true },
		fax: { type: String, trim: true },
		email: {
			type: String,
			required: true,
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
	},
	carrierNumbers: {
		mcNumber: { type: String },
		dotNumber: { type: String },
		einNumber: { type: String },
		iftaNumber: { type: String },
		orNumber: { type: String },
		kyuNumber: { type: String },
		txNumber: { type: String },
		tnNumber: { type: String },
		laNumber: { type: String },
		notes: { type: String },
		files: [
			{
				filename: { type: String, required: true },
				originalname: { type: String, required: true },
				contentType: { type: String, required: true },
				size: { type: Number, required: true },
			},
		],
	},
})

export default model<IUserSettings>('Settings', settingsSchema)
