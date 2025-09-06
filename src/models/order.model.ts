import crypto from 'crypto'
import { model, Schema } from 'mongoose'
import { IOrder, OrderStatus } from '../types/order.types'

const orderSchema: Schema = new Schema<IOrder>(
	{
		userId: { type: String, required: true, index: true, ref: 'User' },
		orderNumber: { type: String, unique: true, sparse: true },

		contact: { type: String, required: true },
		permitStartDate: { type: Date, required: true },

		truckId: { type: String, required: true, ref: 'Truck' },
		trailerId: { type: String, required: true, ref: 'Trailer' },

		commodity: { type: String, required: true },
		loadDims: { type: String, required: true },
		lengthFt: { type: Number, required: true },
		lengthIn: { type: Number, required: true },
		widthFt: { type: Number, required: true },
		widthIn: { type: Number, required: true },
		heightFt: { type: Number, required: true },
		heightIn: { type: Number, required: true },
		rearOverhangFt: { type: Number, required: true },
		rearOverhangIn: { type: Number, required: true },
		makeModel: { type: String },
		serial: { type: String },
		singleMultiple: { type: String },
		legalWeight: { type: String, enum: ['yes', 'no'], required: true },
		originAddress: { type: String, required: true },
		destinationAddress: { type: String, required: true },
		stops: { type: [String], required: true },
		files: [
			{
				filename: { type: String, required: true },
				originalname: { type: String, required: true },
				contentType: { type: String, required: true },
				size: { type: Number, required: true },
			},
		],
		status: {
			type: String,
			enum: Object.values(OrderStatus),
			default: OrderStatus.PENDING,
		},
		axleConfigs: {
			type: [
				{
					tires: { type: Number, required: true },
					tireWidth: { type: Number, required: true },
					weight: { type: Number, required: true },
					spacing: { type: String, required: false },
				},
			],
		},
	},
	{
		timestamps: true,
	},
)

orderSchema.pre('save', async function (next) {
	if (!this.orderNumber) {
		const Order = this.constructor as any
		let attempts = 0
		const maxAttempts = 10

		while (attempts < maxAttempts) {
			const randomNumber = crypto.randomInt(100000, 999999)
			const orderNumber = `ORD-${randomNumber}`

			const existingOrder = await Order.findOne({ orderNumber })

			if (!existingOrder) {
				this.orderNumber = orderNumber
				break
			}

			attempts++
		}

		if (attempts >= maxAttempts) {
			return next(
				new Error(
					'Unable to generate unique order number after maximum attempts',
				),
			)
		}
	}
	next()
})

export default model<IOrder>('Order', orderSchema)
