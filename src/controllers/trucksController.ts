import { NextFunction, Request, Response } from 'express'
import Truck from '../models/truck.model'
import { deleteFile, fileExists, getFile, uploadFile } from '../services/gridfs.service'
import {
  CreatePaginationMeta,
  PaginatedResponse,
  PaginationMeta,
  PaginationQuery,
  SuccessResponse,
} from '../types/response.types'
import { TruckPayload } from '../types/truck.types'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'

export const paginatedTrucks = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { page, limit, search } = req.query as unknown as PaginationQuery
    const skip = (page - 1) * limit
    const userId = req.user.userId

    const totalItems = await Truck.countDocuments({ userId })
    const trucks = await Truck.find({
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
    const meta: PaginationMeta = CreatePaginationMeta(totalItems, page, limit)

    res.status(200).json(PaginatedResponse(trucks, meta))
  },
)

export const createTruck = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.user.userId
  const { year, make, vin, licencePlate, state, nrOfAxles, unitNumber } = req.body as TruckPayload

  if (!licencePlate) return next(new ErrorHandler('Licence plate is required', 400))
  if (!unitNumber) return next(new ErrorHandler('Unit number is required', 400))

  const truckExists = await Truck.findOne({ vin })
  if (truckExists) return next(new ErrorHandler('Truck already exists', 400))

  const truck = await Truck.create({
    userId,
    year,
    make,
    vin,
    licencePlate,
    state,
    nrOfAxles,
    unitNumber,
  })

  res.status(201).json(SuccessResponse(truck, 'Truck created successfully'))
})

export const updateTruck = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { truckId } = req.params
  const { year, make, vin, licencePlate, state, nrOfAxles, unitNumber } = req.body as TruckPayload

  if (!licencePlate) return next(new ErrorHandler('Licence plate is required', 400))
  if (!unitNumber) return next(new ErrorHandler('Unit number is required', 400))

  const existingTruck = await Truck.findOne({ _id: truckId, userId: req.user.userId })
  if (!existingTruck) return next(new ErrorHandler('Truck not found', 404))

  const updatedTruck = await Truck.findByIdAndUpdate(
    truckId,
    { year, make, vin, licencePlate, state, nrOfAxles, unitNumber },
    { new: true },
  )

  res.status(200).json(SuccessResponse(updatedTruck, 'Truck updated successfully'))
})

export const deleteTruck = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { truckId } = req.params
  const userId = req.user.userId

  const truck = await Truck.findOne({ _id: truckId, userId })
  if (!truck) return next(new ErrorHandler('Truck not found', 404))

  await truck.deleteOne()
  res.status(200).json(SuccessResponse(null, 'Truck deleted successfully'))
})

export const getTruck = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { truckId } = req.params
  const userId = req.user.userId

  const truck = await Truck.findOne({ _id: truckId, userId })

  if (!truck) return next(new ErrorHandler('Truck not found', 404))

  res.status(200).json(SuccessResponse(truck, 'Truck fetched successfully'))
})

export const uploadTruckFile = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const file = req.file

    if (!file) return next(new ErrorHandler('File is required', 400))

    const { truckId } = req.params
    const userId = req.user.userId

    const truck = await Truck.findOne({ _id: truckId, userId })
    if (!truck) return next(new ErrorHandler('Truck not found', 404))

    try {
      const fileData = await uploadFile(file)
      const updatedTruck = await Truck.findByIdAndUpdate(
        truckId,
        { $push: { files: { ...fileData, originalname: file.originalname } } },
        { new: true },
      ).lean()

      if (!updatedTruck) return next(new ErrorHandler('Failed to update truck', 500))

      res.status(200).json(SuccessResponse(updatedTruck, 'File uploaded successfully'))
    } catch (error: any) {
      return next(new ErrorHandler(`File upload failed: ${error.message}`, 500))
    }
  },
)

export const getTruckFiles = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { truckId } = req.params
    const userId = req.user.userId

    const truck = await Truck.findOne({ _id: truckId, userId })

    if (!truck) return next(new ErrorHandler('Truck not found', 404))

    const files = truck.files
    res.status(200).json(SuccessResponse(files, 'Files fetched successfully'))
  },
)

export const downloadTruckFile = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { filename } = req.params
    const userId = req.user.userId

    const truck = await Truck.findOne({
      userId,
      'files.filename': filename,
    }).lean()

    if (!truck) return next(new ErrorHandler('File not found or access denied', 404))

    const fileData = truck.files.find((file: any) => file.filename === filename)
    if (!fileData) return next(new ErrorHandler('File metadata not found', 404))

    try {
      const exists = await fileExists(filename)
      if (!exists) {
        return next(new ErrorHandler('File not found in storage', 404))
      }

      res.setHeader('Content-Disposition', `attachment; filename="${fileData.originalname}"`)
      res.setHeader('Content-Type', fileData.contentType)

      const fileStream = await getFile(filename)
      fileStream.pipe(res)
    } catch (error: any) {
      return next(new ErrorHandler(`File download failed: ${error.message}`, 500))
    }
  },
)

export const deleteTruckFile = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { filename } = req.params
    const userId = req.user.userId

    const truck = await Truck.findOne({
      userId,
      'files.filename': filename,
    })

    if (!truck) return next(new ErrorHandler('File not found or access denied', 404))

    try {
      await Truck.updateOne({ userId }, { $pull: { files: { filename } } })

      await deleteFile(filename)

      res.status(200).json(SuccessResponse(null, 'File deleted successfully'))
    } catch (error: any) {
      return next(new ErrorHandler(`File deletion failed: ${error.message}`, 500))
    }
  },
)
