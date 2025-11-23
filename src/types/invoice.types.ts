import { Document } from 'mongoose'

export interface IInvoiceCharge {
	state: string
	oversize: number
	overweight: number
	superload: number
	serviceFee: number
	escort: number
	total: number
}

export interface IInvoiceOrder {
	orderNumber: string
	contact: string
	permitStartDate: Date
	truckNumber: string
	trailerNumber: string
	commodity: string
	lengthFt: number
	lengthIn: number
	widthFt: number
	widthIn: number
	heightFt: number
	heightIn: number
	rearOverhangFt: number
	rearOverhangIn: number
	makeModel?: string
	serial?: string
	singleMultiple?: string
	legalWeight: string
	originAddress: string
	destinationAddress: string
}

export interface IInvoice extends Document {
	_id: string
	invoiceNumber: string
	userId: string
	companyInfo: {
		name: string
		dba?: string
		address: string
		city: string
		state: string
		zip: string
		phone: string
		fax?: string
		email: string
	}
	startDate: Date
	endDate: Date
	orders: IInvoiceOrder[]
	charges: IInvoiceCharge[]
	totalAmount: number
	createdBy: string // Admin user ID
	createdAt: Date
	updatedAt?: Date
}

export type CreateInvoiceRequest = {
	userId: string
	startDate: string | Date
	endDate: string | Date
	charges: IInvoiceCharge[]
}

export type UpdateInvoiceRequest = {
	startDate?: string | Date
	endDate?: string | Date
	charges?: IInvoiceCharge[]
}

export type InvoiceQuery = {
	userId?: string
	startDate?: string
	endDate?: string
	page?: number
	limit?: number
}
