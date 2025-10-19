import { Router } from 'express'
import upload from '../config/multer'
import {
	deleteFile,
	downloadFile,
	getCarrierFiles,
	getCarrierNumbers,
	getCompanySettings,
	updateCarrierNumbers,
	updateCompanyInfo,
	uploadCarrierFile,
} from '../controllers/settings.controller'
import { authMiddleware } from '../middleware/authMiddleware'

const SettingsRoutes: Router = Router()

// Company info routes
SettingsRoutes.get('/company-info', authMiddleware, getCompanySettings)
SettingsRoutes.put('/company-info', authMiddleware, updateCompanyInfo)

// Carrier numbers routes
SettingsRoutes.get('/carrier-numbers', authMiddleware, getCarrierNumbers)
SettingsRoutes.put('/carrier-numbers', authMiddleware, updateCarrierNumbers)

// File management routes - explicitly set no parsing before multer
SettingsRoutes.post(
	'/carrier-numbers/files',
	authMiddleware,
	upload.single('file'),
	uploadCarrierFile,
)
SettingsRoutes.get('/carrier-numbers/files', authMiddleware, getCarrierFiles)
SettingsRoutes.get(
	'/carrier-numbers/files/:filename/:userId',
	authMiddleware,
	downloadFile,
)
SettingsRoutes.delete(
	'/carrier-numbers/files/:filename',
	authMiddleware,
	deleteFile,
)

export default SettingsRoutes
