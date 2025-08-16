import { Document } from 'mongoose'
import { UserRole } from './auth.types'

export interface IInvitation extends Document {
  code: string
  email: string
  role: UserRole
  invitedBy: string
  expiresAt: Date
  used: boolean
  teamId: string
  createdAt: Date
}

export type InviteRequest = {
  email: string
  role: UserRole
}
