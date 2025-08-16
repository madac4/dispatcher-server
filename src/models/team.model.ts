import { Document, model, Schema } from 'mongoose'

interface ITeam extends Document {
  owner: string
  members: string[]
  name?: string
  createdAt: Date
}

const TeamSchema: Schema = new Schema<ITeam>({
  owner: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  members: [
    {
      type: String,
      ref: 'User',
      index: true,
    },
  ],
  name: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const Team = model<ITeam>('Team', TeamSchema)

export default Team
