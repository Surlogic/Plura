"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_LABELS = exports.nextPlanFor = exports.hasPlanAccess = void 0;
const PLAN_ORDER = {
    BASIC: 0,
    PROFESIONAL: 1,
    ENTERPRISE: 2,
};
const hasPlanAccess = (currentPlan, requiredPlan) => {
    if (!currentPlan)
        return false;
    return PLAN_ORDER[currentPlan] >= PLAN_ORDER[requiredPlan];
};
exports.hasPlanAccess = hasPlanAccess;
const nextPlanFor = (currentPlan) => {
    switch (currentPlan) {
        case 'BASIC':
            return 'PROFESIONAL';
        case 'PROFESIONAL':
            return 'ENTERPRISE';
        default:
            return null;
    }
};
exports.nextPlanFor = nextPlanFor;
exports.PLAN_LABELS = {
    BASIC: 'Free',
    PROFESIONAL: 'Pro',
    ENTERPRISE: 'Premium',
};
