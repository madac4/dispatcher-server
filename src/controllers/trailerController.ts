import { NextFunction, Request, Response } from 'express'
import Trailer from '../models/trailer.model'
import {
	deleteFile,
	fileExists,
	getFile,
	uploadFile,
} from '../services/gridfs.service'
import {
	CreatePaginationMeta,
	PaginatedResponse,
	PaginationMeta,
	PaginationQuery,
	SuccessResponse,
} from '../types/response.types'
import { TrailerPayload } from '../types/trailer.types'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'

export const paginatedTrailers = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { page, limit, search } = req.query as unknown as PaginationQuery
		const skip = (page - 1) * limit
		const userId = req.user.userId

		const totalItems = await Trailer.countDocuments({ userId })
		const trailers = await Trailer.find({
			userId,
			$or: [
				{ licencePlate: { $regex: search || '', $options: 'i' } },
				{ unitNumber: { $regex: search || '', $options: 'i' } },
			],
		})
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean()
		const meta: PaginationMeta = CreatePaginationMeta(
			totalItems,
			page,
			limit,
		)

		res.status(200).json(PaginatedResponse(trailers, meta))
	},
)

export const createTrailer = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const userId = req.user.userId
		const {
			year,
			make,
			vin,
			licencePlate,
			state,
			nrOfAxles,
			unitNumber,
			length,
			type,
		} = req.body as TrailerPayload

		if (!licencePlate)
			return next(new ErrorHandler('Licence plate is required', 400))
		if (!unitNumber)
			return next(new ErrorHandler('Unit number is required', 400))

		const trailer = await Trailer.create({
			userId,
			year,
			make,
			vin,
			licencePlate,
			state,
			nrOfAxles,
			unitNumber,
			length,
			type,
		})

		res.status(201).json(
			SuccessResponse(trailer, 'Trailer created successfully'),
		)
	},
)

export const updateTrailer = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { trailerId } = req.params
		const {
			year,
			make,
			vin,
			licencePlate,
			state,
			nrOfAxles,
			unitNumber,
			length,
			type,
		} = req.body as TrailerPayload

		if (!licencePlate)
			return next(new ErrorHandler('Licence plate is required', 400))
		if (!unitNumber)
			return next(new ErrorHandler('Unit number is required', 400))

		const existingTrailer = await Trailer.findOne({
			_id: trailerId,
			userId: req.user.userId,
		})
		if (!existingTrailer)
			return next(new ErrorHandler('Trailer not found', 404))

		const updatedTrailer = await Trailer.findByIdAndUpdate(
			trailerId,
			{
				year,
				make,
				vin,
				licencePlate,
				state,
				nrOfAxles,
				unitNumber,
				length,
				type,
			},
			{ new: true },
		)

		res.status(200).json(
			SuccessResponse(updatedTrailer, 'Trailer updated successfully'),
		)
	},
)

export const deleteTrailer = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { trailerId } = req.params
		const userId = req.user.userId

		const trailer = await Trailer.findOne({ _id: trailerId, userId })
		if (!trailer) return next(new ErrorHandler('Trailer not found', 404))

		await trailer.deleteOne()
		res.status(200).json(
			SuccessResponse(null, 'Trailer deleted successfully'),
		)
	},
)

export const getTrailer = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { trailerId } = req.params
		const userId = req.user.userId

		const trailer = await Trailer.findOne({ _id: trailerId, userId })

		if (!trailer) return next(new ErrorHandler('Trailer not found', 404))

		res.status(200).json(
			SuccessResponse(trailer, 'Trailer fetched successfully'),
		)
	},
)

export const uploadTrailerFile = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { trailerId } = req.params
		const userId = req.user.userId
		const file = req.file

		if (!file) return next(new ErrorHandler('File is required', 400))

		const trailer = await Trailer.findOne({ _id: trailerId, userId })
		if (!trailer) return next(new ErrorHandler('Trailer not found', 404))

		try {
			const fileData = await uploadFile(file)
			const updatedTrailer = await Trailer.findByIdAndUpdate(
				trailerId,
				{
					$push: {
						files: { ...fileData, originalname: file.originalname },
					},
				},
				{ new: true },
			).lean()

			if (!updatedTrailer)
				return next(new ErrorHandler('Failed to update trailer', 500))

			res.status(200).json(
				SuccessResponse(updatedTrailer, 'File uploaded successfully'),
			)
		} catch (error: any) {
			return next(
				new ErrorHandler(`File upload failed: ${error.message}`, 500),
			)
		}
	},
)

export const getTrailerFiles = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { trailerId } = req.params
		const userId = req.user.userId

		const trailer = await Trailer.findOne({ _id: trailerId, userId })

		if (!trailer) return next(new ErrorHandler('Trailer not found', 404))

		const files = trailer.files
		res.status(200).json(
			SuccessResponse(files, 'Files fetched successfully'),
		)
	},
)

export const downloadTrailerFile = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { filename } = req.params
		const userId = req.user.userId

		const trailer = await Trailer.findOne({
			userId,
			'files.filename': filename,
		}).lean()

		if (!trailer)
			return next(
				new ErrorHandler('File not found or access denied', 404),
			)

		const fileData = trailer.files.find(
			(file: any) => file.filename === filename,
		)
		if (!fileData)
			return next(new ErrorHandler('File metadata not found', 404))

		try {
			const exists = await fileExists(filename)
			if (!exists) {
				return next(new ErrorHandler('File not found in storage', 404))
			}

			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${fileData.originalname}"`,
			)
			res.setHeader('Content-Type', fileData.contentType)

			const fileStream = await getFile(filename)
			fileStream.pipe(res)
		} catch (error: any) {
			return next(
				new ErrorHandler(`File download failed: ${error.message}`, 500),
			)
		}
	},
)

export const deleteTrailerFile = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const { filename } = req.params
		const userId = req.user.userId

		const trailer = await Trailer.findOne({
			userId,
			'files.filename': filename,
		})

		if (!trailer)
			return next(
				new ErrorHandler('File not found or access denied', 404),
			)

		try {
			await Trailer.updateOne(
				{ userId },
				{ $pull: { files: { filename } } },
			)

			await deleteFile(filename)

			res.status(200).json(
				SuccessResponse(null, 'File deleted successfully'),
			)
		} catch (error: any) {
			return next(
				new ErrorHandler(`File deletion failed: ${error.message}`, 500),
			)
		}
	},
)
