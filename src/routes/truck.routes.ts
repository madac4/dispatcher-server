import { Router } from 'express'
import upload from '../config/multer'
import {
  createTruck,
  deleteTruck,
  deleteTruckFile,
  downloadTruckFile,
  getTruck,
  getTruckFiles,
  paginatedTrucks,
  updateTruck,
  uploadTruckFile,
} from '../controllers/trucksController'
import { authMiddleware } from '../middleware/authMiddleware'

const TruckRoutes: Router = Router()

TruckRoutes.get('/paginated', authMiddleware, paginatedTrucks)
TruckRoutes.delete('/:truckId', authMiddleware, deleteTruck)
TruckRoutes.put('/:truckId', authMiddleware, updateTruck)
TruckRoutes.post('/', authMiddleware, createTruck)
TruckRoutes.get('/:truckId', authMiddleware, getTruck)

// File management routes - explicitly set no parsing before multer
TruckRoutes.post('/:truckId/files', authMiddleware, upload.single('file'), uploadTruckFile)
TruckRoutes.get('/:truckId/files', authMiddleware, getTruckFiles)
TruckRoutes.get('/:truckId/files/:filename', authMiddleware, downloadTruckFile)
TruckRoutes.delete('/:truckId/files/:filename', authMiddleware, deleteTruckFile)

export default TruckRoutes
