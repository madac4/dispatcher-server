"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
class OrderService {
    // Calculate approximate costs based on load dimensions and route
    static calculateCosts(order, routeInfo) {
        const { lengthFt, lengthIn, widthFt, widthIn, heightFt, heightIn } = order;
        // Convert to total inches for calculations
        const totalLength = lengthFt * 12 + lengthIn;
        const totalWidth = widthFt * 12 + widthIn;
        const totalHeight = heightFt * 12 + heightIn;
        // Base calculations (simplified - you would integrate with actual permit APIs)
        let oversize = 0;
        let overweight = 0;
        let superload = 0;
        let serviceFee = 150; // Base service fee
        let escort = 0;
        // Oversize calculations
        if (totalWidth > 96) {
            // 8 feet
            oversize += 200 * routeInfo.states.length;
        }
        if (totalHeight > 144) {
            // 12 feet
            oversize += 150 * routeInfo.states.length;
        }
        if (totalLength > 960) {
            // 80 feet
            oversize += 300 * routeInfo.states.length;
        }
        // Overweight calculations (simplified)
        // You would need actual weight data from the order
        overweight = 100 * routeInfo.states.length;
        // Superload calculations
        if (totalWidth > 144 || totalHeight > 180 || totalLength > 1200) {
            superload = 500 * routeInfo.states.length;
        }
        // Escort requirements
        if (totalWidth > 120 || totalHeight > 168 || totalLength > 1080) {
            escort = 75 * routeInfo.distance; // $75 per mile for escort
        }
        const total = oversize + overweight + superload + serviceFee + escort;
        return {
            oversize,
            overweight,
            superload,
            serviceFee,
            escort,
            distance: routeInfo.distance,
            total,
        };
    }
    // Validate order data
    static validateOrder(orderData) {
        const errors = [];
        // Required field validation
        const requiredFields = [
            'contact',
            'permitStartDate',
            'truckId',
            'trailerId',
            'commodity',
            'loadDims',
            'lengthFt',
            'lengthIn',
            'widthFt',
            'widthIn',
            'heightFt',
            'heightIn',
            'rearOverhangFt',
            'rearOverhangIn',
            'legalWeight',
            'originAddress',
            'destinationAddress',
        ];
        for (const field of requiredFields) {
            if (!orderData[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }
        // Dimension validation
        if (orderData.lengthFt < 0 || orderData.lengthIn < 0 || orderData.lengthIn > 11) {
            errors.push('Invalid length dimensions');
        }
        if (orderData.widthFt < 0 || orderData.widthIn < 0 || orderData.widthIn > 11) {
            errors.push('Invalid width dimensions');
        }
        if (orderData.heightFt < 0 || orderData.heightIn < 0 || orderData.heightIn > 11) {
            errors.push('Invalid height dimensions');
        }
        if (orderData.rearOverhangFt < 0 || orderData.rearOverhangIn < 0 || orderData.rearOverhangIn > 11) {
            errors.push('Invalid rear overhang dimensions');
        }
        // Date validation
        if (orderData.permitStartDate) {
            const permitDate = new Date(orderData.permitStartDate);
            const today = new Date();
            if (permitDate < today) {
                errors.push('Permit start date cannot be in the past');
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    // Generate route information (simplified - you would integrate with Google Maps API)
    static async getRouteInfo(origin, destination) {
        // This is a simplified implementation
        // In a real application, you would integrate with Google Maps API or similar
        // to get actual distance and route information
        return {
            distance: 500, // Mock distance in miles
            states: ['CA', 'NV', 'AZ'], // Mock states along route
        };
    }
    // Check if vehicle combination is valid
    static validateVehicleCombination(truck, trailer) {
        const errors = [];
        if (!truck) {
            errors.push('Truck is required');
        }
        if (!trailer) {
            errors.push('Trailer is required');
        }
        // Add more validation logic as needed
        // For example, check if truck and trailer are compatible
        // Check if they belong to the same user
        // Check if they are available for the requested dates
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}
exports.OrderService = OrderService;
