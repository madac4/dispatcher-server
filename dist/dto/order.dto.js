"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedOrderDTO = exports.OrderDTO = void 0;
const order_types_1 = require("../types/order.types");
class OrderDTO {
    constructor(model) {
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
exports.OrderDTO = OrderDTO;
class PaginatedOrderDTO {
    constructor(model) {
        this.id = model._id || '';
        this.orderNumber = model.orderNumber || '';
        this.createdAt = model.createdAt;
        this.originAddress = model.originAddress;
        this.destinationAddress = model.destinationAddress;
        this.truckId = model.truckId.unitNumber;
        this.status = model.status || order_types_1.OrderStatus.PENDING;
    }
}
exports.PaginatedOrderDTO = PaginatedOrderDTO;
