"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBillingPlanFromBackendPlanCode = exports.resolveBillingPlanFromProfilePlanCode = exports.sharedBillingPlanById = exports.sharedBillingPlans = void 0;
exports.sharedBillingPlans = [
    {
        id: 'BASIC',
        label: 'BASIC',
        backendPlanCode: 'PLAN_BASIC',
        profilePlanCode: 'BASIC',
        priceMonthly: 0,
        priceLabel: 'Gratis',
        benefits: ['Perfil publico', 'Agenda basica', 'Reservas manuales'],
    },
    {
        id: 'PROFESIONAL',
        label: 'PROFESIONAL',
        backendPlanCode: 'PLAN_PROFESIONAL',
        profilePlanCode: 'PROFESIONAL',
        priceMonthly: 590,
        priceLabel: '$590 UYU / mes',
        benefits: ['Pagos online', 'Analytics basicos', 'Automatizaciones', 'Perfil mejorado'],
        recommended: true,
    },
    {
        id: 'ENTERPRISE',
        label: 'ENTERPRISE',
        backendPlanCode: 'PLAN_ENTERPRISE',
        profilePlanCode: 'ENTERPRISE',
        priceMonthly: 1290,
        priceLabel: '$1.290 UYU / mes',
        benefits: ['Todo lo de PROFESIONAL', 'Tienda', 'Chat interno', 'Mayor capacidad operativa'],
    },
];
exports.sharedBillingPlanById = exports.sharedBillingPlans.reduce((accumulator, plan) => {
    accumulator[plan.id] = plan;
    return accumulator;
}, {
    BASIC: exports.sharedBillingPlans[0],
    PROFESIONAL: exports.sharedBillingPlans[1],
    ENTERPRISE: exports.sharedBillingPlans[2],
});
const resolveBillingPlanFromProfilePlanCode = (planCode) => {
    switch (planCode?.toUpperCase()) {
        case 'PROFESIONAL':
            return 'PROFESIONAL';
        case 'ENTERPRISE':
            return 'ENTERPRISE';
        case 'BASIC':
        default:
            return 'BASIC';
    }
};
exports.resolveBillingPlanFromProfilePlanCode = resolveBillingPlanFromProfilePlanCode;
const resolveBillingPlanFromBackendPlanCode = (planCode) => {
    switch (planCode?.toUpperCase()) {
        case 'PLAN_BASIC':
            return 'BASIC';
        case 'PLAN_PROFESIONAL':
            return 'PROFESIONAL';
        case 'PLAN_ENTERPRISE':
            return 'ENTERPRISE';
        default:
            return null;
    }
};
exports.resolveBillingPlanFromBackendPlanCode = resolveBillingPlanFromBackendPlanCode;
