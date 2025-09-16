#!/usr/bin/env node

/**
 * 🧪 Advanced JOLT Generation Test Suite
 * Complex, edge case, and stress testing for JOLT generation
 * Tests the most challenging scenarios your system might encounter
 */

const fs = require('fs');

// Console colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    bold: '\x1b[1m'
};

// Test statistics
let testStats = {
    total: 0,
    passed: 0,
    failed: 0,
    startTime: Date.now()
};

// Helper functions from your code
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
}

// Your actual JOLT generation function
function generateSessionAwareJoltSpecs(requestMapping, menuArrayName) {
    const sessionAwareRequestJolt = [];
    
    // Check if any fields need session data from selected items
    const hasSessionFields = requestMapping.some(field => 
        field.mappingType === 'session' && field.storeAttribute && 
        (field.storeAttribute.includes('selectedItem.') || field.storeAttribute.includes('_selectedItem.'))
    );
    
    if (hasSessionFields) {
        // Step 1: modify-overwrite-beta to extract selected item data
        const modifySpec = {};
        
        // Calculate selectedIndex from user selection (1,2,3... → 0,1,2...)
        modifySpec.selectedIndex = "=intSubtract(@(1,input.selection),1)";
        
        // Extract the selected item from the menu array
        modifySpec.selectedItem = `=elementAt(@(1,${menuArrayName}),@(1,selectedIndex))`;
        
        sessionAwareRequestJolt.push({
            operation: "modify-overwrite-beta",
            spec: modifySpec
        });
    }
    
    // Step 2: shift operation for final field mapping
    const requestShiftSpec = {
        input: {}
    };
    const requestDefaultSpec = {};
    
    requestMapping.forEach(field => {
        if (field.mappingType === 'dynamic' && field.storeAttribute) {
            // Regular dynamic fields from input
            setNestedValue(requestShiftSpec.input, field.storeAttribute, field.targetPath || field.path);
        } else if (field.mappingType === 'session' && field.storeAttribute && 
                   field.storeAttribute.includes('selectedItem.')) {
            // Session fields from selected items - map directly from selectedItem
            const parts = field.storeAttribute.split('selectedItem.');
            if (parts.length >= 2) {
                const fieldName = parts[1]; // e.g., 'title', 'year', 'author'
                const targetPath = field.targetPath || field.path; // e.g., 'profileDetails.authProfile'
                
                // Map selectedItem.fieldName directly to target path
                setNestedValue(requestShiftSpec, `selectedItem.${fieldName}`, targetPath);
            }
        } else if (field.mappingType === 'static') {
            // Static fields
            setNestedValue(requestDefaultSpec, field.targetPath || field.path, field.staticValue || field.value);
        }
    });
    
    sessionAwareRequestJolt.push({
        operation: "shift",
        spec: requestShiftSpec
    });
    
    sessionAwareRequestJolt.push({
        operation: "default",
        spec: requestDefaultSpec
    });
    
    return sessionAwareRequestJolt;
}

// Standard JOLT generation
function generateJoltSpecs(requestMapping) {
    const requestShiftSpec = {
        input: {}
    };
    const requestDefaultSpec = {};

    requestMapping.forEach(field => {
        if (field.mappingType === 'dynamic' && field.storeAttribute) {
            setNestedValue(requestShiftSpec.input, field.storeAttribute, field.targetPath || field.path);
        } else if (field.mappingType === 'static' && field.category !== 'header') {
            setNestedValue(requestDefaultSpec, field.targetPath || field.path, field.staticValue || field.value);
        }
    });

    return [
        {
            operation: "shift",
            spec: requestShiftSpec
        },
        {
            operation: "default",
            spec: requestDefaultSpec
        }
    ];
}

// 🔥 ADVANCED TEST CASES - Complex scenarios
const ADVANCED_TEST_CASES = [
    {
        name: "🏢 Complex Enterprise Banking API",
        description: "Multi-level nested objects with arrays and complex field mappings",
        requestMapping: [
            { mappingType: 'dynamic', storeAttribute: 'CUSTOMER_ID', targetPath: 'request.customer.identification.customerId' },
            { mappingType: 'dynamic', storeAttribute: 'PIN', targetPath: 'request.authentication.credentials.pin' },
            { mappingType: 'dynamic', storeAttribute: 'AMOUNT', targetPath: 'request.transaction.details.amount.value' },
            { mappingType: 'session', storeAttribute: 'selectedItem.accountNumber', targetPath: 'request.transaction.destination.account.number' },
            { mappingType: 'session', storeAttribute: 'selectedItem.accountType', targetPath: 'request.transaction.destination.account.type' },
            { mappingType: 'session', storeAttribute: 'selectedItem.bankCode', targetPath: 'request.transaction.destination.bank.code' },
            { mappingType: 'session', storeAttribute: 'selectedItem.bankName', targetPath: 'request.transaction.destination.bank.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.accountHolderName', targetPath: 'request.transaction.destination.beneficiary.fullName' },
            { mappingType: 'static', staticValue: 'INTER_BANK_TRANSFER', targetPath: 'request.transaction.type' },
            { mappingType: 'static', staticValue: 'USD', targetPath: 'request.transaction.details.amount.currency' },
            { mappingType: 'static', staticValue: 'HIGH', targetPath: 'request.transaction.priority' },
            { mappingType: 'static', staticValue: 'v2.1', targetPath: 'request.metadata.apiVersion' }
        ],
        hasSessionFields: true,
        menuArrayName: 'items_menu_BANK_ACCOUNTS_SEARCH_items',
        expectedStructure: {
            operationCount: 3,
            operations: ['modify-overwrite-beta', 'shift', 'default'],
            hasModifyOverwrite: true,
            dynamicFieldCount: 3,
            sessionFieldCount: 5,
            staticFieldCount: 4
        }
    },
    {
        name: "🛍️ E-commerce with Product Variants",
        description: "Complex product selection with variants, pricing tiers, and inventory",
        requestMapping: [
            { mappingType: 'dynamic', storeAttribute: 'USER_ID', targetPath: 'order.customer.userId' },
            { mappingType: 'dynamic', storeAttribute: 'QUANTITY', targetPath: 'order.items[0].quantity' },
            { mappingType: 'dynamic', storeAttribute: 'SHIPPING_ADDRESS_ID', targetPath: 'order.shipping.addressId' },
            { mappingType: 'session', storeAttribute: 'selectedItem.productId', targetPath: 'order.items[0].product.id' },
            { mappingType: 'session', storeAttribute: 'selectedItem.variantId', targetPath: 'order.items[0].product.variantId' },
            { mappingType: 'session', storeAttribute: 'selectedItem.sku', targetPath: 'order.items[0].product.sku' },
            { mappingType: 'session', storeAttribute: 'selectedItem.name', targetPath: 'order.items[0].product.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.price', targetPath: 'order.items[0].pricing.unitPrice' },
            { mappingType: 'session', storeAttribute: 'selectedItem.discountTier', targetPath: 'order.items[0].pricing.discountTier' },
            { mappingType: 'session', storeAttribute: 'selectedItem.category', targetPath: 'order.items[0].product.category.primary' },
            { mappingType: 'session', storeAttribute: 'selectedItem.brand', targetPath: 'order.items[0].product.brand.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.weight', targetPath: 'order.items[0].shipping.weight' },
            { mappingType: 'static', staticValue: 'ONLINE_ORDER', targetPath: 'order.source' },
            { mappingType: 'static', staticValue: 'STANDARD', targetPath: 'order.shipping.method' },
            { mappingType: 'static', staticValue: 'PENDING', targetPath: 'order.status' }
        ],
        hasSessionFields: true,
        menuArrayName: 'items_menu_PRODUCT_CATALOG_VARIANTS_items',
        expectedStructure: {
            operationCount: 3,
            operations: ['modify-overwrite-beta', 'shift', 'default'],
            hasModifyOverwrite: true,
            dynamicFieldCount: 3,
            sessionFieldCount: 9,
            staticFieldCount: 3
        }
    },
    {
        name: "📚 Academic Course Registration",
        description: "Complex educational system with courses, prerequisites, and schedules",
        requestMapping: [
            { mappingType: 'dynamic', storeAttribute: 'STUDENT_ID', targetPath: 'registration.student.id' },
            { mappingType: 'dynamic', storeAttribute: 'SEMESTER', targetPath: 'registration.academic.semester' },
            { mappingType: 'dynamic', storeAttribute: 'YEAR', targetPath: 'registration.academic.year' },
            { mappingType: 'session', storeAttribute: 'selectedItem.courseId', targetPath: 'registration.course.id' },
            { mappingType: 'session', storeAttribute: 'selectedItem.courseCode', targetPath: 'registration.course.code' },
            { mappingType: 'session', storeAttribute: 'selectedItem.courseName', targetPath: 'registration.course.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.credits', targetPath: 'registration.course.credits' },
            { mappingType: 'session', storeAttribute: 'selectedItem.department', targetPath: 'registration.course.department.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.instructor', targetPath: 'registration.course.instructor.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.schedule', targetPath: 'registration.course.schedule.timeSlot' },
            { mappingType: 'session', storeAttribute: 'selectedItem.room', targetPath: 'registration.course.location.room' },
            { mappingType: 'session', storeAttribute: 'selectedItem.building', targetPath: 'registration.course.location.building' },
            { mappingType: 'session', storeAttribute: 'selectedItem.maxEnrollment', targetPath: 'registration.course.enrollment.maximum' },
            { mappingType: 'session', storeAttribute: 'selectedItem.currentEnrollment', targetPath: 'registration.course.enrollment.current' },
            { mappingType: 'static', staticValue: 'REGULAR', targetPath: 'registration.type' },
            { mappingType: 'static', staticValue: 'ACTIVE', targetPath: 'registration.status' }
        ],
        hasSessionFields: true,
        menuArrayName: 'items_menu_COURSE_CATALOG_items',
        expectedStructure: {
            operationCount: 3,
            operations: ['modify-overwrite-beta', 'shift', 'default'],
            hasModifyOverwrite: true,
            dynamicFieldCount: 3,
            sessionFieldCount: 11,
            staticFieldCount: 2
        }
    },
    {
        name: "🏥 Healthcare Appointment Booking",
        description: "Medical system with complex doctor, specialty, and time slot management",
        requestMapping: [
            { mappingType: 'dynamic', storeAttribute: 'PATIENT_ID', targetPath: 'appointment.patient.id' },
            { mappingType: 'dynamic', storeAttribute: 'INSURANCE_NUMBER', targetPath: 'appointment.patient.insurance.policyNumber' },
            { mappingType: 'dynamic', storeAttribute: 'PREFERRED_DATE', targetPath: 'appointment.scheduling.preferredDate' },
            { mappingType: 'dynamic', storeAttribute: 'URGENCY_LEVEL', targetPath: 'appointment.medical.urgencyLevel' },
            { mappingType: 'session', storeAttribute: 'selectedItem.doctorId', targetPath: 'appointment.provider.doctor.id' },
            { mappingType: 'session', storeAttribute: 'selectedItem.doctorName', targetPath: 'appointment.provider.doctor.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.specialty', targetPath: 'appointment.provider.doctor.specialty.primary' },
            { mappingType: 'session', storeAttribute: 'selectedItem.licenseNumber', targetPath: 'appointment.provider.doctor.credentials.license' },
            { mappingType: 'session', storeAttribute: 'selectedItem.hospitalId', targetPath: 'appointment.location.hospital.id' },
            { mappingType: 'session', storeAttribute: 'selectedItem.hospitalName', targetPath: 'appointment.location.hospital.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.department', targetPath: 'appointment.location.department.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.floor', targetPath: 'appointment.location.department.floor' },
            { mappingType: 'session', storeAttribute: 'selectedItem.room', targetPath: 'appointment.location.department.room' },
            { mappingType: 'session', storeAttribute: 'selectedItem.availableSlots', targetPath: 'appointment.scheduling.availableTimeSlots' },
            { mappingType: 'session', storeAttribute: 'selectedItem.consultationFee', targetPath: 'appointment.billing.consultationFee' },
            { mappingType: 'static', staticValue: 'CONSULTATION', targetPath: 'appointment.type' },
            { mappingType: 'static', staticValue: 'REQUESTED', targetPath: 'appointment.status' },
            { mappingType: 'static', staticValue: '60', targetPath: 'appointment.duration.minutes' }
        ],
        hasSessionFields: true,
        menuArrayName: 'items_menu_DOCTOR_AVAILABILITY_items',
        expectedStructure: {
            operationCount: 3,
            operations: ['modify-overwrite-beta', 'shift', 'default'],
            hasModifyOverwrite: true,
            dynamicFieldCount: 4,
            sessionFieldCount: 11,
            staticFieldCount: 3
        }
    },
    {
        name: "🚗 Vehicle Fleet Management",
        description: "Complex fleet booking with vehicle specs, driver assignments, and route planning",
        requestMapping: [
            { mappingType: 'dynamic', storeAttribute: 'EMPLOYEE_ID', targetPath: 'booking.requester.employeeId' },
            { mappingType: 'dynamic', storeAttribute: 'DRIVER_LICENSE', targetPath: 'booking.requester.driverLicense.number' },
            { mappingType: 'dynamic', storeAttribute: 'PICKUP_DATE', targetPath: 'booking.schedule.pickup.date' },
            { mappingType: 'dynamic', storeAttribute: 'RETURN_DATE', targetPath: 'booking.schedule.return.date' },
            { mappingType: 'dynamic', storeAttribute: 'PURPOSE', targetPath: 'booking.purpose.description' },
            { mappingType: 'session', storeAttribute: 'selectedItem.vehicleId', targetPath: 'booking.vehicle.id' },
            { mappingType: 'session', storeAttribute: 'selectedItem.make', targetPath: 'booking.vehicle.specifications.make' },
            { mappingType: 'session', storeAttribute: 'selectedItem.model', targetPath: 'booking.vehicle.specifications.model' },
            { mappingType: 'session', storeAttribute: 'selectedItem.year', targetPath: 'booking.vehicle.specifications.year' },
            { mappingType: 'session', storeAttribute: 'selectedItem.licensePlate', targetPath: 'booking.vehicle.registration.licensePlate' },
            { mappingType: 'session', storeAttribute: 'selectedItem.fuelType', targetPath: 'booking.vehicle.specifications.fuelType' },
            { mappingType: 'session', storeAttribute: 'selectedItem.capacity', targetPath: 'booking.vehicle.specifications.passengerCapacity' },
            { mappingType: 'session', storeAttribute: 'selectedItem.mileage', targetPath: 'booking.vehicle.maintenance.currentMileage' },
            { mappingType: 'session', storeAttribute: 'selectedItem.location', targetPath: 'booking.vehicle.location.currentParking' },
            { mappingType: 'session', storeAttribute: 'selectedItem.gpsUnit', targetPath: 'booking.vehicle.tracking.gpsUnitId' },
            { mappingType: 'session', storeAttribute: 'selectedItem.insurancePolicy', targetPath: 'booking.vehicle.insurance.policyNumber' },
            { mappingType: 'static', staticValue: 'BUSINESS', targetPath: 'booking.category' },
            { mappingType: 'static', staticValue: 'PENDING_APPROVAL', targetPath: 'booking.status' },
            { mappingType: 'static', staticValue: 'STANDARD', targetPath: 'booking.priority' }
        ],
        hasSessionFields: true,
        menuArrayName: 'items_menu_FLEET_VEHICLES_items',
        expectedStructure: {
            operationCount: 3,
            operations: ['modify-overwrite-beta', 'shift', 'default'],
            hasModifyOverwrite: true,
            dynamicFieldCount: 5,
            sessionFieldCount: 11,
            staticFieldCount: 3
        }
    },
    {
        name: "🔐 Security Access Control",
        description: "Complex security system with multi-level permissions and access zones",
        requestMapping: [
            { mappingType: 'dynamic', storeAttribute: 'EMPLOYEE_ID', targetPath: 'accessRequest.requester.employeeId' },
            { mappingType: 'dynamic', storeAttribute: 'BADGE_NUMBER', targetPath: 'accessRequest.requester.badge.number' },
            { mappingType: 'dynamic', storeAttribute: 'JUSTIFICATION', targetPath: 'accessRequest.justification.businessReason' },
            { mappingType: 'session', storeAttribute: 'selectedItem.zoneId', targetPath: 'accessRequest.target.zone.id' },
            { mappingType: 'session', storeAttribute: 'selectedItem.zoneName', targetPath: 'accessRequest.target.zone.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.securityLevel', targetPath: 'accessRequest.target.zone.security.level' },
            { mappingType: 'session', storeAttribute: 'selectedItem.building', targetPath: 'accessRequest.target.location.building' },
            { mappingType: 'session', storeAttribute: 'selectedItem.floor', targetPath: 'accessRequest.target.location.floor' },
            { mappingType: 'session', storeAttribute: 'selectedItem.department', targetPath: 'accessRequest.target.zone.department.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.accessType', targetPath: 'accessRequest.permissions.type' },
            { mappingType: 'session', storeAttribute: 'selectedItem.timeRestrictions', targetPath: 'accessRequest.permissions.timeRestrictions' },
            { mappingType: 'session', storeAttribute: 'selectedItem.approverRequired', targetPath: 'accessRequest.workflow.approver.required' },
            { mappingType: 'session', storeAttribute: 'selectedItem.maxDuration', targetPath: 'accessRequest.permissions.maxDuration.hours' },
            { mappingType: 'static', staticValue: 'TEMPORARY', targetPath: 'accessRequest.type' },
            { mappingType: 'static', staticValue: 'PENDING', targetPath: 'accessRequest.status' },
            { mappingType: 'static', staticValue: 'HIGH', targetPath: 'accessRequest.priority' }
        ],
        hasSessionFields: true,
        menuArrayName: 'items_menu_SECURITY_ZONES_items',
        expectedStructure: {
            operationCount: 3,
            operations: ['modify-overwrite-beta', 'shift', 'default'],
            hasModifyOverwrite: true,
            dynamicFieldCount: 3,
            sessionFieldCount: 10,
            staticFieldCount: 3
        }
    },
    {
        name: "📦 Supply Chain Logistics",
        description: "Complex supply chain with vendors, products, and multi-tier logistics",
        requestMapping: [
            { mappingType: 'dynamic', storeAttribute: 'PROCUREMENT_ID', targetPath: 'order.procurement.requestId' },
            { mappingType: 'dynamic', storeAttribute: 'QUANTITY', targetPath: 'order.items[0].quantity.requested' },
            { mappingType: 'dynamic', storeAttribute: 'DELIVERY_DATE', targetPath: 'order.logistics.delivery.requiredDate' },
            { mappingType: 'dynamic', storeAttribute: 'BUDGET_CODE', targetPath: 'order.financial.budgetCode' },
            { mappingType: 'session', storeAttribute: 'selectedItem.vendorId', targetPath: 'order.vendor.id' },
            { mappingType: 'session', storeAttribute: 'selectedItem.vendorName', targetPath: 'order.vendor.companyName' },
            { mappingType: 'session', storeAttribute: 'selectedItem.vendorRating', targetPath: 'order.vendor.performanceRating' },
            { mappingType: 'session', storeAttribute: 'selectedItem.productCode', targetPath: 'order.items[0].product.code' },
            { mappingType: 'session', storeAttribute: 'selectedItem.productName', targetPath: 'order.items[0].product.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.unitPrice', targetPath: 'order.items[0].pricing.unitPrice' },
            { mappingType: 'session', storeAttribute: 'selectedItem.minimumOrder', targetPath: 'order.items[0].constraints.minimumOrderQuantity' },
            { mappingType: 'session', storeAttribute: 'selectedItem.leadTime', targetPath: 'order.items[0].logistics.leadTime.days' },
            { mappingType: 'session', storeAttribute: 'selectedItem.shippingMethod', targetPath: 'order.logistics.shipping.method' },
            { mappingType: 'session', storeAttribute: 'selectedItem.warehouseLocation', targetPath: 'order.logistics.warehouse.location' },
            { mappingType: 'session', storeAttribute: 'selectedItem.qualityCertification', targetPath: 'order.items[0].quality.certification' },
            { mappingType: 'static', staticValue: 'PROCUREMENT', targetPath: 'order.type' },
            { mappingType: 'static', staticValue: 'DRAFT', targetPath: 'order.status' },
            { mappingType: 'static', staticValue: 'USD', targetPath: 'order.financial.currency' }
        ],
        hasSessionFields: true,
        menuArrayName: 'items_menu_VENDOR_CATALOG_items',
        expectedStructure: {
            operationCount: 3,
            operations: ['modify-overwrite-beta', 'shift', 'default'],
            hasModifyOverwrite: true,
            dynamicFieldCount: 4,
            sessionFieldCount: 11,
            staticFieldCount: 3
        }
    },
    {
        name: "🎬 Media Content Management",
        description: "Complex media system with content metadata, licensing, and distribution",
        requestMapping: [
            { mappingType: 'dynamic', storeAttribute: 'USER_ID', targetPath: 'request.user.id' },
            { mappingType: 'dynamic', storeAttribute: 'SUBSCRIPTION_TIER', targetPath: 'request.user.subscription.tier' },
            { mappingType: 'dynamic', storeAttribute: 'DEVICE_TYPE', targetPath: 'request.playback.device.type' },
            { mappingType: 'dynamic', storeAttribute: 'QUALITY_PREFERENCE', targetPath: 'request.playback.quality.preferred' },
            { mappingType: 'session', storeAttribute: 'selectedItem.contentId', targetPath: 'request.content.id' },
            { mappingType: 'session', storeAttribute: 'selectedItem.title', targetPath: 'request.content.metadata.title' },
            { mappingType: 'session', storeAttribute: 'selectedItem.genre', targetPath: 'request.content.metadata.genre.primary' },
            { mappingType: 'session', storeAttribute: 'selectedItem.duration', targetPath: 'request.content.metadata.duration.seconds' },
            { mappingType: 'session', storeAttribute: 'selectedItem.rating', targetPath: 'request.content.metadata.contentRating' },
            { mappingType: 'session', storeAttribute: 'selectedItem.language', targetPath: 'request.content.metadata.language.primary' },
            { mappingType: 'session', storeAttribute: 'selectedItem.licenseType', targetPath: 'request.content.licensing.type' },
            { mappingType: 'session', storeAttribute: 'selectedItem.expiryDate', targetPath: 'request.content.licensing.expiryDate' },
            { mappingType: 'session', storeAttribute: 'selectedItem.drmProtection', targetPath: 'request.content.security.drm.enabled' },
            { mappingType: 'session', storeAttribute: 'selectedItem.streamingUrl', targetPath: 'request.content.delivery.streamingUrl' },
            { mappingType: 'session', storeAttribute: 'selectedItem.thumbnailUrl', targetPath: 'request.content.metadata.thumbnail.url' },
            { mappingType: 'static', staticValue: 'STREAM', targetPath: 'request.action' },
            { mappingType: 'static', staticValue: 'IMMEDIATE', targetPath: 'request.playback.startMode' },
            { mappingType: 'static', staticValue: 'true', targetPath: 'request.analytics.trackPlayback' }
        ],
        hasSessionFields: true,
        menuArrayName: 'items_menu_MEDIA_CATALOG_items',
        expectedStructure: {
            operationCount: 3,
            operations: ['modify-overwrite-beta', 'shift', 'default'],
            hasModifyOverwrite: true,
            dynamicFieldCount: 4,
            sessionFieldCount: 11,
            staticFieldCount: 3
        }
    },
    {
        name: "🏭 Industrial IoT Equipment",
        description: "Complex IoT system with sensors, maintenance, and production data",
        requestMapping: [
            { mappingType: 'dynamic', storeAttribute: 'TECHNICIAN_ID', targetPath: 'maintenance.technician.id' },
            { mappingType: 'dynamic', storeAttribute: 'WORK_ORDER_ID', targetPath: 'maintenance.workOrder.id' },
            { mappingType: 'dynamic', storeAttribute: 'PRIORITY_LEVEL', targetPath: 'maintenance.priority.level' },
            { mappingType: 'session', storeAttribute: 'selectedItem.equipmentId', targetPath: 'maintenance.equipment.id' },
            { mappingType: 'session', storeAttribute: 'selectedItem.equipmentName', targetPath: 'maintenance.equipment.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.manufacturer', targetPath: 'maintenance.equipment.manufacturer.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.model', targetPath: 'maintenance.equipment.model.number' },
            { mappingType: 'session', storeAttribute: 'selectedItem.serialNumber', targetPath: 'maintenance.equipment.serial.number' },
            { mappingType: 'session', storeAttribute: 'selectedItem.location', targetPath: 'maintenance.equipment.location.zone' },
            { mappingType: 'session', storeAttribute: 'selectedItem.operationalStatus', targetPath: 'maintenance.equipment.status.operational' },
            { mappingType: 'session', storeAttribute: 'selectedItem.lastMaintenance', targetPath: 'maintenance.equipment.history.lastMaintenanceDate' },
            { mappingType: 'session', storeAttribute: 'selectedItem.sensorData', targetPath: 'maintenance.equipment.sensors.currentReadings' },
            { mappingType: 'session', storeAttribute: 'selectedItem.warningThresholds', targetPath: 'maintenance.equipment.sensors.warningThresholds' },
            { mappingType: 'session', storeAttribute: 'selectedItem.criticalThresholds', targetPath: 'maintenance.equipment.sensors.criticalThresholds' },
            { mappingType: 'static', staticValue: 'PREVENTIVE', targetPath: 'maintenance.type' },
            { mappingType: 'static', staticValue: 'SCHEDULED', targetPath: 'maintenance.status' },
            { mappingType: 'static', staticValue: 'PRODUCTION_LINE_A', targetPath: 'maintenance.area.designation' }
        ],
        hasSessionFields: true,
        menuArrayName: 'items_menu_EQUIPMENT_INVENTORY_items',
        expectedStructure: {
            operationCount: 3,
            operations: ['modify-overwrite-beta', 'shift', 'default'],
            hasModifyOverwrite: true,
            dynamicFieldCount: 3,
            sessionFieldCount: 11,
            staticFieldCount: 3
        }
    },
    {
        name: "🎓 Complex University Course Registration",
        description: "Advanced academic system with prerequisites, conflicts, and resource allocation",
        requestMapping: [
            { mappingType: 'dynamic', storeAttribute: 'STUDENT_ID', targetPath: 'enrollment.student.identification.universityId' },
            { mappingType: 'dynamic', storeAttribute: 'ACADEMIC_YEAR', targetPath: 'enrollment.academic.year' },
            { mappingType: 'dynamic', storeAttribute: 'SEMESTER', targetPath: 'enrollment.academic.semester.code' },
            { mappingType: 'dynamic', storeAttribute: 'REGISTRATION_PRIORITY', targetPath: 'enrollment.student.registration.priorityLevel' },
            { mappingType: 'session', storeAttribute: 'selectedItem.courseId', targetPath: 'enrollment.course.identification.id' },
            { mappingType: 'session', storeAttribute: 'selectedItem.courseCode', targetPath: 'enrollment.course.identification.code' },
            { mappingType: 'session', storeAttribute: 'selectedItem.courseName', targetPath: 'enrollment.course.details.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.credits', targetPath: 'enrollment.course.details.creditHours' },
            { mappingType: 'session', storeAttribute: 'selectedItem.prerequisites', targetPath: 'enrollment.course.requirements.prerequisites' },
            { mappingType: 'session', storeAttribute: 'selectedItem.corequisites', targetPath: 'enrollment.course.requirements.corequisites' },
            { mappingType: 'session', storeAttribute: 'selectedItem.department', targetPath: 'enrollment.course.department.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.faculty', targetPath: 'enrollment.course.faculty.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.instructor', targetPath: 'enrollment.course.instructor.primaryInstructor.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.instructorEmail', targetPath: 'enrollment.course.instructor.primaryInstructor.email' },
            { mappingType: 'session', storeAttribute: 'selectedItem.schedule', targetPath: 'enrollment.course.schedule.timeSlots' },
            { mappingType: 'session', storeAttribute: 'selectedItem.classroom', targetPath: 'enrollment.course.location.classroom.number' },
            { mappingType: 'session', storeAttribute: 'selectedItem.building', targetPath: 'enrollment.course.location.building.name' },
            { mappingType: 'session', storeAttribute: 'selectedItem.capacity', targetPath: 'enrollment.course.enrollment.maximumCapacity' },
            { mappingType: 'session', storeAttribute: 'selectedItem.enrolled', targetPath: 'enrollment.course.enrollment.currentEnrollment' },
            { mappingType: 'session', storeAttribute: 'selectedItem.waitlist', targetPath: 'enrollment.course.enrollment.waitlistCount' },
            { mappingType: 'session', storeAttribute: 'selectedItem.tuition', targetPath: 'enrollment.course.financial.tuitionCost' },
            { mappingType: 'static', staticValue: 'REGULAR', targetPath: 'enrollment.type' },
            { mappingType: 'static', staticValue: 'REQUESTED', targetPath: 'enrollment.status' },
            { mappingType: 'static', staticValue: 'UNDERGRADUATE', targetPath: 'enrollment.student.level' }
        ],
        hasSessionFields: true,
        menuArrayName: 'items_menu_COURSE_CATALOG_ADVANCED_items',
        expectedStructure: {
            operationCount: 3,
            operations: ['modify-overwrite-beta', 'shift', 'default'],
            hasModifyOverwrite: true,
            dynamicFieldCount: 4,
            sessionFieldCount: 17,
            staticFieldCount: 3
        }
    }
];

// Validation function
function validateComplexJOLT(jolt, expected, testCase) {
    const results = {
        passed: true,
        errors: [],
        warnings: [],
        performance: {}
    };
    
    const startValidation = Date.now();
    
    // Check operation count
    if (jolt.length !== expected.operationCount) {
        results.passed = false;
        results.errors.push(`Expected ${expected.operationCount} operations, got ${jolt.length}`);
    }
    
    // Check operation sequence
    const operations = jolt.map(op => op.operation);
    expected.operations.forEach((expectedOp, index) => {
        if (operations[index] !== expectedOp) {
            results.passed = false;
            results.errors.push(`Expected operation ${index + 1} to be '${expectedOp}', got '${operations[index] || 'undefined'}'`);
        }
    });
    
    // Check modify-overwrite-beta presence and structure
    const hasModify = operations.includes('modify-overwrite-beta');
    if (hasModify !== expected.hasModifyOverwrite) {
        results.passed = false;
        results.errors.push(`modify-overwrite-beta presence mismatch: expected ${expected.hasModifyOverwrite}, got ${hasModify}`);
    }
    
    if (expected.hasModifyOverwrite) {
        const modifyOp = jolt.find(op => op.operation === 'modify-overwrite-beta');
        if (modifyOp) {
            // Validate formula correctness
            if (!modifyOp.spec.selectedIndex || modifyOp.spec.selectedIndex !== "=intSubtract(@(1,input.selection),1)") {
                results.passed = false;
                results.errors.push('Incorrect or missing selectedIndex formula');
            }
            
            if (!modifyOp.spec.selectedItem || !modifyOp.spec.selectedItem.includes(testCase.menuArrayName)) {
                results.passed = false;
                results.errors.push(`selectedItem formula missing or doesn't reference ${testCase.menuArrayName}`);
            }
            
            // Check for correct elementAt formula structure
            if (modifyOp.spec.selectedItem && !modifyOp.spec.selectedItem.match(/=elementAt\(@\(1,.+\),@\(1,selectedIndex\)\)/)) {
                results.passed = false;
                results.errors.push('selectedItem formula structure is incorrect');
            }
        }
    }
    
    // Validate shift operation structure
    const shiftOp = jolt.find(op => op.operation === 'shift');
    if (shiftOp) {
        // Count dynamic fields
        const dynamicFields = Object.keys(shiftOp.spec.input || {}).length;
        if (expected.dynamicFieldCount !== undefined && dynamicFields !== expected.dynamicFieldCount) {
            results.passed = false;
            results.errors.push(`Expected ${expected.dynamicFieldCount} dynamic fields, got ${dynamicFields}`);
        }
        
        // Count session fields
        const sessionFields = Object.keys(shiftOp.spec.selectedItem || {}).length;
        if (expected.sessionFieldCount !== undefined && sessionFields !== expected.sessionFieldCount) {
            results.passed = false;
            results.errors.push(`Expected ${expected.sessionFieldCount} session fields, got ${sessionFields}`);
        }
        
        // Validate field mapping structure
        if (shiftOp.spec.input) {
            Object.entries(shiftOp.spec.input).forEach(([key, value]) => {
                if (typeof value !== 'string') {
                    results.errors.push(`Dynamic field mapping error: ${key} -> ${value} should be string`);
                    results.passed = false;
                }
            });
        }
        
        if (shiftOp.spec.selectedItem) {
            Object.entries(shiftOp.spec.selectedItem).forEach(([key, value]) => {
                if (typeof value !== 'string') {
                    results.errors.push(`Session field mapping error: ${key} -> ${value} should be string`);
                    results.passed = false;
                }
            });
        }
    }
    
    // Validate default operation with proper nested field counting
    const defaultOp = jolt.find(op => op.operation === 'default');
    if (defaultOp) {
        // Helper function to count nested fields
        function countNestedFields(obj) {
            let count = 0;
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    count += countNestedFields(value);
                } else {
                    count++;
                }
            }
            return count;
        }
        
        const staticFields = countNestedFields(defaultOp.spec || {});
        if (expected.staticFieldCount !== undefined && staticFields !== expected.staticFieldCount) {
            results.passed = false;
            results.errors.push(`Expected ${expected.staticFieldCount} static fields, got ${staticFields}`);
        }
    }
    
    // Performance analysis
    results.performance.validationTime = Date.now() - startValidation;
    results.performance.joltSize = JSON.stringify(jolt).length;
    results.performance.complexity = testCase.requestMapping.length;
    
    // Complex structure warnings
    if (testCase.requestMapping.length > 15) {
        results.warnings.push('High complexity test case (>15 fields) - monitor performance');
    }
    
    if (JSON.stringify(jolt).length > 5000) {
        results.warnings.push('Large JOLT specification generated - consider optimization');
    }
    
    return results;
}

// Test execution function
function runComplexTest(testCase, index) {
    const startTime = Date.now();
    testStats.total++;
    
    console.log(`\n${colors.bold}${colors.cyan}🧪 Advanced Test ${index + 1}: ${testCase.name}${colors.reset}`);
    console.log(`${colors.gray}   ${testCase.description}${colors.reset}`);
    console.log(`${colors.gray}   Complexity: ${testCase.requestMapping.length} fields, Menu: ${testCase.menuArrayName}${colors.reset}`);
    
    try {
        // Generate JOLT using your actual logic
        let generatedJOLT;
        if (testCase.hasSessionFields) {
            generatedJOLT = generateSessionAwareJoltSpecs(testCase.requestMapping, testCase.menuArrayName);
        } else {
            generatedJOLT = generateJoltSpecs(testCase.requestMapping);
        }
        
        // Validate structure
        const validation = validateComplexJOLT(generatedJOLT, testCase.expectedStructure, testCase);
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        if (validation.passed) {
            testStats.passed++;
            console.log(`${colors.green}   ✅ PASSED${colors.reset} (${executionTime}ms, ${validation.performance.joltSize} bytes)`);
            
            if (validation.warnings.length > 0) {
                console.log(`${colors.yellow}   ⚠️  Warnings:${colors.reset}`);
                validation.warnings.forEach(warning => {
                    console.log(`${colors.yellow}      • ${warning}${colors.reset}`);
                });
            }
        } else {
            testStats.failed++;
            console.log(`${colors.red}   ❌ FAILED${colors.reset} (${executionTime}ms)`);
            console.log(`${colors.red}   Errors:${colors.reset}`);
            validation.errors.forEach(error => {
                console.log(`${colors.red}      • ${error}${colors.reset}`);
            });
        }
        
        // Show performance metrics
        console.log(`${colors.gray}   📊 Performance: Validation ${validation.performance.validationTime}ms, Size ${validation.performance.joltSize} bytes${colors.reset}`);
        
        // Show generated JOLT for failed tests or if verbose
        if (!validation.passed || process.argv.includes('--verbose')) {
            console.log(`${colors.gray}   🔧 Generated JOLT Structure:${colors.reset}`);
            const preview = {
                operationCount: generatedJOLT.length,
                operations: generatedJOLT.map(op => op.operation),
                complexityScore: testCase.requestMapping.length
            };
            console.log(`${colors.gray}   ${JSON.stringify(preview, null, 2)}${colors.reset}`);
        }
        
        return {
            passed: validation.passed,
            generatedJOLT,
            validation,
            executionTime,
            error: null
        };
        
    } catch (error) {
        testStats.failed++;
        const endTime = Date.now();
        console.log(`${colors.red}   ❌ FAILED${colors.reset} (${endTime - startTime}ms)`);
        console.log(`${colors.red}   Error: ${error.message}${colors.reset}`);
        
        return {
            passed: false,
            generatedJOLT: null,
            validation: { errors: [error.message] },
            executionTime: endTime - startTime,
            error
        };
    }
}

// Main test runner
function runAdvancedTests() {
    console.log(`${colors.bold}${colors.magenta}🔥 Advanced JOLT Generation Test Suite${colors.reset}`);
    console.log(`${colors.gray}Testing complex, real-world scenarios with high field counts${colors.reset}`);
    console.log(`${colors.gray}==========================================================${colors.reset}`);
    
    const results = [];
    let totalComplexity = 0;
    let totalJoltSize = 0;
    
    ADVANCED_TEST_CASES.forEach((testCase, index) => {
        const result = runComplexTest(testCase, index);
        results.push({ testCase, result });
        
        totalComplexity += testCase.requestMapping.length;
        if (result.validation && result.validation.performance) {
            totalJoltSize += result.validation.performance.joltSize || 0;
        }
    });
    
    // Comprehensive summary
    const endTime = Date.now();
    const totalTime = endTime - testStats.startTime;
    const successRate = Math.round((testStats.passed / testStats.total) * 100);
    const avgComplexity = Math.round(totalComplexity / testStats.total);
    const avgJoltSize = Math.round(totalJoltSize / testStats.total);
    
    console.log(`\n${colors.bold}${colors.magenta}📊 Advanced Test Results${colors.reset}`);
    console.log(`${colors.gray}==============================${colors.reset}`);
    console.log(`${colors.white}Total Tests:${colors.reset} ${testStats.total}`);
    console.log(`${colors.green}Passed:${colors.reset} ${testStats.passed}`);
    console.log(`${colors.red}Failed:${colors.reset} ${testStats.failed}`);
    console.log(`${colors.cyan}Success Rate:${colors.reset} ${successRate}%`);
    console.log(`${colors.gray}Total Time:${colors.reset} ${totalTime}ms`);
    console.log(`${colors.blue}Average Complexity:${colors.reset} ${avgComplexity} fields per test`);
    console.log(`${colors.blue}Average JOLT Size:${colors.reset} ${avgJoltSize} bytes`);
    console.log(`${colors.blue}Total Field Count:${colors.reset} ${totalComplexity} fields tested`);
    
    // Complexity breakdown
    console.log(`\n${colors.bold}${colors.cyan}🔍 Complexity Analysis${colors.reset}`);
    console.log(`${colors.gray}======================${colors.reset}`);
    
    const complexityRanges = {
        'Simple (5-10 fields)': results.filter(r => r.testCase.requestMapping.length <= 10).length,
        'Medium (11-15 fields)': results.filter(r => r.testCase.requestMapping.length > 10 && r.testCase.requestMapping.length <= 15).length,
        'Complex (16-20 fields)': results.filter(r => r.testCase.requestMapping.length > 15 && r.testCase.requestMapping.length <= 20).length,
        'Very Complex (20+ fields)': results.filter(r => r.testCase.requestMapping.length > 20).length
    };
    
    Object.entries(complexityRanges).forEach(([range, count]) => {
        if (count > 0) {
            console.log(`${colors.blue}${range}:${colors.reset} ${count} tests`);
        }
    });
    
    // Final verdict
    if (testStats.passed === testStats.total) {
        console.log(`\n${colors.bold}${colors.green}🎉 ALL ADVANCED TESTS PASSED!${colors.reset}`);
        console.log(`${colors.green}Your JOLT generation logic handles complex scenarios perfectly!${colors.reset}`);
        console.log(`${colors.green}✓ Complex nested objects${colors.reset}`);
        console.log(`${colors.green}✓ High field count scenarios (20+ fields)${colors.reset}`);
        console.log(`${colors.green}✓ Real-world enterprise APIs${colors.reset}`);
        console.log(`${colors.green}✓ Performance under complexity${colors.reset}`);
    } else {
        console.log(`\n${colors.red}⚠️ ${testStats.failed} advanced test(s) failed.${colors.reset}`);
        console.log(`${colors.yellow}Check the detailed output above for specific issues.${colors.reset}`);
    }
    
    // Export detailed results if requested
    if (process.argv.includes('--export')) {
        const exportData = {
            timestamp: new Date().toISOString(),
            testSuite: 'Advanced JOLT Generation Tests',
            stats: testStats,
            complexity: {
                totalFields: totalComplexity,
                averageFieldsPerTest: avgComplexity,
                averageJoltSize: avgJoltSize,
                complexityRanges
            },
            results: results.map(r => ({
                testName: r.testCase.name,
                complexity: r.testCase.requestMapping.length,
                passed: r.result.passed,
                executionTime: r.result.executionTime,
                joltSize: r.result.validation?.performance?.joltSize || 0,
                errors: r.result.validation?.errors || [],
                warnings: r.result.validation?.warnings || []
            }))
        };
        
        const filename = `advanced-jolt-test-results-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
        console.log(`\n${colors.blue}📁 Detailed results exported to: ${filename}${colors.reset}`);
    }
    
    process.exit(testStats.failed > 0 ? 1 : 0);
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        console.log(`${colors.bold}${colors.magenta}🔥 Advanced JOLT Test Suite${colors.reset}`);
        console.log('');
        console.log('Usage: node advanced-jolt-tests.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --help      Show this help message');
        console.log('  --verbose   Show detailed JOLT output for all tests');
        console.log('  --export    Export detailed results to JSON file');
        console.log('');
        console.log('Test Scenarios:');
        console.log('• Complex Enterprise Banking APIs');
        console.log('• E-commerce with Product Variants');
        console.log('• Healthcare Appointment Systems');
        console.log('• Vehicle Fleet Management');
        console.log('• Security Access Control');
        console.log('• Supply Chain Logistics');
        console.log('• Media Content Management');
        console.log('• Industrial IoT Equipment');
        console.log('• Advanced University Systems');
    } else {
        runAdvancedTests();
    }
}

module.exports = {
    runAdvancedTests,
    ADVANCED_TEST_CASES,
    generateSessionAwareJoltSpecs,
    validateComplexJOLT
};