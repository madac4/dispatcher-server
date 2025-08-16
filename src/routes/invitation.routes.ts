import { Router } from 'express'
import { createInvitation, removeInvitation } from '../controllers/invitationController'
import { authMiddleware } from '../middleware/authMiddleware'
import { rolesMiddleware } from '../middleware/rolesMiddleware'
import { UserRole } from '../types/auth.types'

const InvitationRoutes: Router = Router()

InvitationRoutes.post('/invite', authMiddleware, rolesMiddleware([UserRole.ADMIN]), createInvitation)
InvitationRoutes.delete('/delete/:inviteId', authMiddleware, rolesMiddleware([UserRole.ADMIN]), removeInvitation)

export default InvitationRoutes
