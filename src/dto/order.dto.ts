import { IOrder, OrderStatus } from '../types/order.types';
import { IUserSettings } from '../types/settings.types';

export class OrderDTO {
  id: string;
  orderNumber: string;
  userId: string;
  contact: string;
  permitStartDate: Date;
  originAddress: string;
  destinationAddress: string;
  commodity: string;
  loadDims: string;
  lengthFt: number;
  lengthIn: number;
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
  rearOverhangFt: number;
  rearOverhangIn: number;
  makeModel: string;
  serial: string;
  singleMultiple: string;
  legalWeight: 'yes' | 'no';
  stops: string[];
  files: {
    filename: string;
    originalname: string;
    contentType: string;
    size: number;
  }[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
  truck?: {
    id: string;
    unitNumber: string;
    year: number;
    make: string;
    licencePlate: string;
    state: string;
    nrOfAxles: number;
    vin: string;
  };
  trailer?: {
    id: string;
    unitNumber: string;
    year: number;
    make: string;
    licencePlate: string;
    state: string;
    nrOfAxles: number;
    vin: string;
    length: string;
    type: string;
  };
  axleConfigs: {
    tires: number;
    tireWidth: number;
    weight: number;
    spacing: string;
  }[];

  constructor(model: IOrder) {
    this.id = model._id || '';
    this.orderNumber = model.orderNumber || '';
    this.userId = model.userId;
    this.contact = model.contact;
    this.permitStartDate = model.permitStartDate;
    this.originAddress = model.originAddress;
    this.destinationAddress = model.destinationAddress;
    this.commodity = model.commodity;
    this.loadDims = model.loadDims;
    this.lengthFt = model.lengthFt;
    this.lengthIn = model.lengthIn;
    this.widthFt = model.widthFt;
    this.widthIn = model.widthIn;
    this.heightFt = model.heightFt;
    this.heightIn = model.heightIn;
    this.rearOverhangFt = model.rearOverhangFt;
    this.rearOverhangIn = model.rearOverhangIn;
    this.makeModel = model.makeModel || '';
    this.serial = model.serial || '';
    this.singleMultiple = model.singleMultiple || '';
    this.legalWeight = model.legalWeight;
    this.stops = model.stops || [];
    this.files = model.files || [];
    this.status = model.status;
    this.createdAt = model.createdAt;
    this.updatedAt = model.updatedAt;
    this.axleConfigs = model.axleConfigs || [];
    if (model.truckId) {
      const truck = model.truckId;
      this.truck = {
        id: truck._id,
        unitNumber: truck.unitNumber,
        year: truck.year,
        make: truck.make,
        licencePlate: truck.licencePlate,
        state: truck.state,
        nrOfAxles: truck.nrOfAxles,
        vin: truck.vin,
      };
    }

    if (model.trailerId) {
      const trailer = model.trailerId;
      this.trailer = {
        id: trailer._id,
        unitNumber: trailer.unitNumber,
        year: trailer.year,
        make: trailer.make,
        licencePlate: trailer.licencePlate,
        state: trailer.state,
        nrOfAxles: trailer.nrOfAxles,
        vin: trailer.vin,
        length: trailer.length,
        type: trailer.type,
      };
    }
  }
}

export class ModeratorOrderDTO {
  id: string;
  orderNumber: string;
  userId: string;
  contact: string;
  permitStartDate: Date;
  originAddress: string;
  destinationAddress: string;
  commodity: string;
  loadDims: string;
  lengthFt: number;
  lengthIn: number;
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
  rearOverhangFt: number;
  rearOverhangIn: number;
  makeModel: string;
  serial: string;
  singleMultiple: string;
  legalWeight: 'yes' | 'no';
  stops: string[];
  files: {
    filename: string;
    originalname: string;
    contentType: string;
    size: number;
  }[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
  truck?: {
    id: string;
    unitNumber: string;
    year: number;
    make: string;
    licencePlate: string;
    state: string;
    nrOfAxles: number;
    vin: string;
  };
  trailer?: {
    id: string;
    unitNumber: string;
    year: number;
    make: string;
    licencePlate: string;
    state: string;
    nrOfAxles: number;
    vin: string;
    length: string;
    type: string;
  };
  axleConfigs: {
    tires: number;
    tireWidth: number;
    weight: number;
    spacing: string;
  }[];
  carrierNumbers: {
    mcNumber?: string;
    dotNumber?: string;
    einNumber?: string;
    iftaNumber?: string;
    orNumber?: string;
    kyuNumber?: string;
    txNumber?: string;
    tnNumber?: string;
    laNumber?: string;
    notes?: string;
    files: {
      filename: string;
      originalname: string;
      contentType: string;
      size: number;
    }[];
  };
  companyInfo: {
    name: string;
    dba?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    fax?: string;
    email: string;
  };

  constructor(model: IOrder, settings: IUserSettings) {
    this.id = model._id || '';
    this.orderNumber = model.orderNumber || '';
    this.userId = model.userId;
    this.contact = model.contact;
    this.permitStartDate = model.permitStartDate;
    this.originAddress = model.originAddress;
    this.destinationAddress = model.destinationAddress;
    this.commodity = model.commodity;
    this.loadDims = model.loadDims;
    this.lengthFt = model.lengthFt;
    this.lengthIn = model.lengthIn;
    this.widthFt = model.widthFt;
    this.widthIn = model.widthIn;
    this.heightFt = model.heightFt;
    this.heightIn = model.heightIn;
    this.rearOverhangFt = model.rearOverhangFt;
    this.rearOverhangIn = model.rearOverhangIn;
    this.makeModel = model.makeModel || '';
    this.serial = model.serial || '';
    this.singleMultiple = model.singleMultiple || '';
    this.legalWeight = model.legalWeight;
    this.stops = model.stops || [];
    this.files = model.files || [];
    this.status = model.status;
    this.createdAt = model.createdAt;
    this.updatedAt = model.updatedAt;
    this.axleConfigs = model.axleConfigs || [];
    if (model.truckId) {
      const truck = model.truckId;
      this.truck = {
        id: truck._id,
        unitNumber: truck.unitNumber,
        year: truck.year,
        make: truck.make,
        licencePlate: truck.licencePlate,
        state: truck.state,
        nrOfAxles: truck.nrOfAxles,
        vin: truck.vin,
      };
    }

    if (model.trailerId) {
      const trailer = model.trailerId;
      this.trailer = {
        id: trailer._id,
        unitNumber: trailer.unitNumber,
        year: trailer.year,
        make: trailer.make,
        licencePlate: trailer.licencePlate,
        state: trailer.state,
        nrOfAxles: trailer.nrOfAxles,
        vin: trailer.vin,
        length: trailer.length,
        type: trailer.type,
      };
    }

    ((this.carrierNumbers = {
      mcNumber: settings.carrierNumbers.mcNumber,
      dotNumber: settings.carrierNumbers.dotNumber,
      einNumber: settings.carrierNumbers.einNumber,
      iftaNumber: settings.carrierNumbers.iftaNumber,
      orNumber: settings.carrierNumbers.orNumber,
      kyuNumber: settings.carrierNumbers.kyuNumber,
      txNumber: settings.carrierNumbers.txNumber,
      tnNumber: settings.carrierNumbers.tnNumber,
      laNumber: settings.carrierNumbers.laNumber,
      notes: settings.carrierNumbers.notes,
      files: settings.carrierNumbers.files,
    }),
      (this.companyInfo = settings.companyInfo || {
        name: '',
        dba: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        fax: '',
        email: '',
      }));
  }
}

export class PaginatedOrderDTO {
  id: string;
  orderNumber: string;
  createdAt: Date;
  originAddress: string;
  destinationAddress: string;
  truckId: string;
  status: OrderStatus;

  constructor(model: IOrder) {
    this.id = model._id || '';
    this.orderNumber = model.orderNumber || '';
    this.createdAt = model.createdAt;
    this.originAddress = model.originAddress;
    this.destinationAddress = model.destinationAddress;
    this.truckId = model.truckId.unitNumber;
    this.status = model.status || OrderStatus.PENDING;
  }
}
