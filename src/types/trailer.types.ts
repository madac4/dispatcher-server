import { Document } from 'mongoose'

export interface ITrailer extends Document {
  userId: string
  year: number
  make: string
  vin: string
  licencePlate: string
  state: string
  nrOfAxles: number
  length: string
  type: string
  unitNumber: string
  createdAt: Date
  files: { filename: string; originalname: string; contentType: string; size: number }[]
}

export type TrailerDTO = ITrailer & {
  _id: string
}

export interface TrailerPayload {
  year: number
  make: string
  vin: string
  licencePlate: string
  state: string
  nrOfAxles: number
  length: number
  type: string
  unitNumber: string
}
