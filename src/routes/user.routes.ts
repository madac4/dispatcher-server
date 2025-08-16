import { Router } from 'express'
import { changePassword } from '../controllers/userController'
import { authMiddleware } from '../middleware/authMiddleware'

const UserRoutes: Router = Router()

UserRoutes.post('/change-password', authMiddleware, changePassword)

export default UserRoutes
