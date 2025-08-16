interface ICompanyInfo {
  name: string
  dba?: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  fax?: string
  email: string
}

interface ICarrierNumber {
  _id?: string
  mcNumber?: string
  dotNumber?: string
  einNumber?: string
  iftaNumber?: string
  orNumber?: string
  kyuNumber?: string
  txNumber?: string
  tnNumber?: string
  laNumber?: string
  notes?: string
  files: { filename: string; originalname: string; contentType: string; size: number }[]
}

export interface IUserSettings extends Document {
  userId: string
  companyInfo: ICompanyInfo
  carrierNumbers: ICarrierNumber
}
