import { Router } from 'express'
import upload from '../config/multer'
import {
  createTrailer,
  deleteTrailer,
  deleteTrailerFile,
  downloadTrailerFile,
  getTrailer,
  getTrailerFiles,
  paginatedTrailers,
  updateTrailer,
  uploadTrailerFile,
} from '../controllers/trailerController'
import { authMiddleware } from '../middleware/authMiddleware'

const TrailerRoutes: Router = Router()

TrailerRoutes.get('/paginated', authMiddleware, paginatedTrailers)
TrailerRoutes.delete('/:trailerId', authMiddleware, deleteTrailer)
TrailerRoutes.put('/:trailerId', authMiddleware, updateTrailer)
TrailerRoutes.get('/:trailerId', authMiddleware, getTrailer)
TrailerRoutes.post('/', authMiddleware, createTrailer)

// File management routes - explicitly set no parsing before multer
TrailerRoutes.post('/:trailerId/files', authMiddleware, upload.single('file'), uploadTrailerFile)
TrailerRoutes.get('/:trailerId/files', authMiddleware, getTrailerFiles)
TrailerRoutes.get('/:trailerId/files/:filename', authMiddleware, downloadTrailerFile)
TrailerRoutes.delete('/:trailerId/files/:filename', authMiddleware, deleteTrailerFile)

export default TrailerRoutes
