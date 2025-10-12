export interface ContactFormDTO {
	firstName: string
	lastName: string
	email: string
	phone?: string
	subject: string
	company?: string
	message: string
}

export interface ContactFormResponse {
	success: boolean
	message: string
}
