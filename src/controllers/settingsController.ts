import { NextFunction, Request, Response } from 'express'
import Settings from '../models/settings.model'
import { fileExists, getFile, deleteFile as gridFsDeleteFile, uploadFile } from '../services/gridfs.service'
import { SuccessResponse } from '../types/response.types'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'
import { validateEmail } from '../utils/validators'

export const getCompanySettings = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user.userId

    const settings = await Settings.findOne({ userId: userId }).lean()

    if (!settings) {
      res.status(200).json(SuccessResponse({ companyInfo: null }))
      return
    }

    const companyInfo = settings?.companyInfo

    res.status(200).json(SuccessResponse(companyInfo, 'Company settings fetched successfully'))
  },
)

export const updateCompanyInfo = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, dba, address, city, state, zip, phone, fax, email } = req.body

    if (email) {
      if (!validateEmail(email)) return next(new ErrorHandler('Invalid email', 400))
    }

    const settings = await Settings.findOne({ userId: req.user.userId })

    if (!settings) {
      const newSettings = await Settings.create({
        userId: req.user.userId,
        companyInfo: { name, dba, address, city, state, zip, phone, fax, email },
      })
      res.status(201).json(SuccessResponse(newSettings.companyInfo, 'Company information saved'))
      return
    }

    const updatedCompany = await Settings.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $set: {
          companyInfo: {
            name,
            dba,
            address,
            city,
            state,
            zip,
            phone,
            fax,
            email,
          },
        },
      },
      { new: true, runValidators: true, upsert: true },
    ).lean()

    if (!updatedCompany) return next(new ErrorHandler('Company information not found', 404))

    res.status(200).json(SuccessResponse(updatedCompany.companyInfo, 'Company information updated'))
  },
)

export const getCarrierNumbers = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user.userId

    const settings = await Settings.findOne({ userId }).lean()

    if (!settings) {
      res.status(200).json(SuccessResponse({ carrierNumbers: null }))
      return
    }

    res.status(200).json(SuccessResponse(settings.carrierNumbers, 'Carrier numbers fetched'))
  },
)

export const updateCarrierNumbers = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user.userId
    const { mcNumber, dotNumber, einNumber, iftaNumber, orNumber, kyuNumber, txNumber, tnNumber, laNumber, notes } =
      req.body

    const settings = await Settings.findOne({ userId })

    if (!settings) {
      const newSettings = await Settings.create({
        userId,
        carrierNumbers: {
          mcNumber,
          dotNumber,
          einNumber,
          iftaNumber,
          orNumber,
          kyuNumber,
          txNumber,
          tnNumber,
          laNumber,
          notes,
          files: [],
        },
      })
      res.status(201).json(SuccessResponse(newSettings.carrierNumbers, 'Carrier numbers saved'))
      return
    }

    const existingFiles = settings.carrierNumbers?.files || []

    const updatedSettings = await Settings.findOneAndUpdate(
      { userId },
      {
        $set: {
          carrierNumbers: {
            mcNumber,
            dotNumber,
            einNumber,
            iftaNumber,
            orNumber,
            kyuNumber,
            txNumber,
            tnNumber,
            laNumber,
            notes,
            files: existingFiles,
          },
        },
      },
      { new: true },
    ).lean()

    if (!updatedSettings) return next(new ErrorHandler('Carrier numbers not found', 404))

    res.status(200).json(SuccessResponse(updatedSettings.carrierNumbers, 'Carrier numbers updated'))
  },
)

export const uploadCarrierFile = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const file = req.file

    console.log(file)

    if (!file) return next(new ErrorHandler('File is required', 400))

    const userId = req.user.userId

    const settings = await Settings.findOne({ userId })
    if (!settings) return next(new ErrorHandler('Settings not found', 404))

    try {
      const fileData = await uploadFile(file)

      const updatedSettings = await Settings.findOneAndUpdate(
        { userId },
        { $push: { 'carrierNumbers.files': { ...fileData, originalname: file.originalname } } },
        { new: true },
      ).lean()

      if (!updatedSettings) return next(new ErrorHandler('Failed to update settings', 500))

      res.status(200).json(SuccessResponse(null, 'File uploaded successfully'))
    } catch (error: any) {
      return next(new ErrorHandler(`File upload failed: ${error.message}`, 500))
    }
  },
)

export const getCarrierFiles = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user.userId

    const settings = await Settings.findOne({ userId }).lean()
    if (!settings) {
      res.status(200).json(SuccessResponse({ files: [] }, 'No files found'))
      return
    }

    const files = settings.carrierNumbers.files
    res.status(200).json(SuccessResponse(files, 'Files fetched successfully'))
  },
)

export const downloadFile = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { filename } = req.params
  const userId = req.user.userId

  const settings = await Settings.findOne({
    userId,
    'carrierNumbers.files.filename': filename,
  }).lean()

  if (!settings) return next(new ErrorHandler('File not found or access denied', 404))

  const fileData = settings.carrierNumbers.files.find(file => file.filename === filename)
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
})

export const deleteFile = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { filename } = req.params
  const userId = req.user.userId

  const settings = await Settings.findOne({
    userId,
    'carrierNumbers.files.filename': filename,
  })

  if (!settings) return next(new ErrorHandler('File not found or access denied', 404))

  try {
    await Settings.updateOne({ userId }, { $pull: { 'carrierNumbers.files': { filename } } })

    await gridFsDeleteFile(filename)

    res.status(200).json(SuccessResponse(null, 'File deleted successfully'))
  } catch (error: any) {
    return next(new ErrorHandler(`File deletion failed: ${error.message}`, 500))
  }
})
