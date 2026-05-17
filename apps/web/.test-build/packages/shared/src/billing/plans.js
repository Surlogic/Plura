"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBillingPlanFromBackendPlanCode = exports.resolveBillingPlanFromProfilePlanCode = exports.sharedBillingPlanById = exports.sharedBillingPlans = void 0;
exports.sharedBillingPlans = [
    {
        id: 'CORE',
        label: 'Plura Core',
        backendPlanCode: 'PLAN_CORE',
        profilePlanCode: 'CORE',
        priceMonthly: 590,
        priceLabel: '2 meses gratis, luego suscripcion mensual',
        benefits: [
            'Pagina publica, marketplace y reservas online',
            'Agenda, calendario, horarios y bloqueos',
            'Servicios, dashboard y notificaciones',
            'Perfil publico con logo, banner, descripcion y fotos',
            '1 profesional y 1 local incluidos',
            'Cobros online con Mercado Pago',
        ],
        recommended: true,
    },
];
exports.sharedBillingPlanById = {
    CORE: exports.sharedBillingPlans[0],
};
const resolveBillingPlanFromProfilePlanCode = (planCode) => (planCode?.toUpperCase() === 'CORE' ? 'CORE' : null);
exports.resolveBillingPlanFromProfilePlanCode = resolveBillingPlanFromProfilePlanCode;
const resolveBillingPlanFromBackendPlanCode = (planCode) => {
    switch (planCode?.toUpperCase()) {
        case 'PLAN_CORE':
            return 'CORE';
        default:
            return null;
    }
};
exports.resolveBillingPlanFromBackendPlanCode = resolveBillingPlanFromBackendPlanCode;
