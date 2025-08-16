import { model, Schema } from 'mongoose'
import { ITrailer } from '../types/trailer.types'

const trailerSchema: Schema = new Schema<ITrailer>({
  userId: { type: String, required: true, index: true, ref: 'User' },
  year: { type: Number, required: true },
  make: { type: String, required: true },
  vin: { type: String, required: true, unique: true },
  licencePlate: { type: String, required: true },
  state: { type: String, required: true },
  nrOfAxles: { type: Number, required: true },
  length: { type: String },
  type: { type: String, required: true },
  unitNumber: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  files: [
    {
      filename: { type: String, required: true },
      originalname: { type: String, required: true },
      contentType: { type: String, required: true },
      size: { type: Number, required: true },
    },
  ],
})

export default model<ITrailer>('Trailer', trailerSchema)
