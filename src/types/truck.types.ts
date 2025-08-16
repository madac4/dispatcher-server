export interface ITruck extends Document {
  userId: string
  year: number
  make: string
  vin: string
  licencePlate: string
  state: string
  nrOfAxles: number
  unitNumber: string
  createdAt: Date
  files: { filename: string; originalname: string; contentType: string; size: number }[]
}

export type TruckDTO = ITruck & {
  _id: string
}

export interface TruckPayload {
  year: number
  make: string
  vin: string
  licencePlate: string
  state: string
  nrOfAxles: number
  unitNumber: string
}
