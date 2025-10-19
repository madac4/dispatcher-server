import { IUser } from './auth.types'
import { TrailerDTO } from './trailer.types'
import { TruckDTO } from './truck.types'

export interface IOrder {
	_id?: string
	userId: string | IUser
	orderNumber?: string

	contact: string
	permitStartDate: Date

	truckId: TruckDTO
	trailerId: TrailerDTO
	moderatorId: IUser
	stops: string[]
	commodity: string
	loadDims: string
	lengthFt: number
	lengthIn: number
	widthFt: number
	widthIn: number
	heightFt: number
	heightIn: number
	rearOverhangFt: number
	rearOverhangIn: number
	makeModel: string
	serial: string
	singleMultiple: string
	legalWeight: 'yes' | 'no'
	originAddress: string
	destinationAddress: string
	orderMessage: string
	files: {
		filename: string
		originalname: string
		contentType: string
		size: number
	}[]
	status: OrderStatus
	createdAt: Date
	updatedAt: Date
	axleConfigs: {
		tires: number
		tireWidth: number
		weight: number
		spacing: string
	}[]
}

export interface ICreateOrderRequest {
	contact: string
	permitStartDate: string
	truckId: string
	trailerId: string
	commodity: string
	loadDims: string
	lengthFt: number
	lengthIn: number
	widthFt: number
	widthIn: number
	heightFt: number
	heightIn: number
	rearOverhangFt: number
	rearOverhangIn: number
	makeModel: string
	serial: string
	singleMultiple: string
	legalWeight: 'yes' | 'no'
	originAddress: string
	destinationAddress: string
	messages?: string[]
	stops?: string[] | string
	axleConfigs?:
		| {
				tires: number
				tireWidth: number
				weight: number
				spacing: string
		  }[]
		| string
}

export interface IUpdateOrderRequest extends Partial<ICreateOrderRequest> {
	status?: OrderStatus
}

export enum OrderStatus {
	ALL = 'all',
	PENDING = 'pending',
	PROCESSING = 'processing',
	REQUIRES_INVOICE = 'requires_invoice',
	REQUIRES_CHARGE = 'requires_charge',
	CHARGED = 'charged',
	CANCELLED = 'cancelled',
	FINISHED = 'finished',
}

export enum OrderStatusType {
	ALL = 'all',
	ACTIVE = 'active',
	COMPLETED = 'completed',
	PAID = 'paid',
	ARCHIVED = 'archived',
}

export const formatStatus = (status: OrderStatus) => {
	return status
		.replace('_', ' ')
		.toLowerCase()
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}
