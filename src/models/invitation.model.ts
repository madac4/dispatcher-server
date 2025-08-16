import { model, Schema } from 'mongoose'
import { UserRole } from '../types/auth.types'
import { IInvitation } from '../types/invitation.types'

const invitationSchema: Schema = new Schema<IInvitation>({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  },
  invitedBy: {
    type: String,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: {
      expires: '7d',
    },
  },
  teamId: {
    type: String,
    ref: 'Team',
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default model<IInvitation>('Invitation', invitationSchema)
