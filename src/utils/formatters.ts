import { OrderStatus } from '../types/order.types';

export const formatStatus = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.PENDING:
      return 'Pending';
    case OrderStatus.PROCESSING:
      return 'Processing';
    case OrderStatus.REQUIRES_INVOICE:
      return 'Requires Invoice';
    case OrderStatus.REQUIRES_CHARGE:
      return 'Requires Charge';
    case OrderStatus.CHARGED:
      return 'Charged';
    case OrderStatus.CANCELLED:
      return 'Cancelled';
    case OrderStatus.FINISHED:
      return 'Active';
  }
};
