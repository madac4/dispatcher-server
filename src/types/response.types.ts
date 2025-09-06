export interface ResponseModel<T> {
	data: T | null
	status: number
	success: boolean
	message?: string
}

export interface PaginationMeta {
	totalItems: number
	totalPages: number
	currentPage: number
	itemsPerPage: number
}

export interface PaginatedModel<T> extends ResponseModel<T[]> {
	data: T[]
	meta: PaginationMeta
}

export function SuccessResponse<T>(
	data: T | null = null,
	message?: string,
	status: number = 200,
): ResponseModel<T> {
	return {
		status,
		success: true,
		message,
		data,
	}
}

export function ErrorResponse(
	message: string,
	status: number = 500,
): ResponseModel<{}> {
	return {
		status,
		success: false,
		message,
		data: {},
	}
}

export function PaginatedResponse<T>(
	data: T[],
	meta: PaginationMeta,
	message?: string,
	status: number = 200,
): PaginatedModel<T> {
	return {
		status,
		success: true,
		message,
		meta,
		data,
	}
}

export function CreatePaginationMeta(
	totalItems: number,
	page: number,
	limit: number,
): PaginationMeta {
	return {
		totalItems,
		totalPages: Math.ceil(totalItems / limit),
		currentPage: Number(page),
		itemsPerPage: Number(limit),
	}
}

export type PaginationQuery<T = Record<string, string>> = {
	page: number
	limit: number
	search: string
	additionalValues: T
}
