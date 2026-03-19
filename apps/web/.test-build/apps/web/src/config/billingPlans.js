"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBillingPlanFromProfilePlanCode = exports.resolveBillingPlanFromBackendPlanCode = exports.billingPlanById = exports.billingPlans = void 0;
const plans_1 = require("../../../../packages/shared/src/billing/plans");
Object.defineProperty(exports, "resolveBillingPlanFromBackendPlanCode", { enumerable: true, get: function () { return plans_1.resolveBillingPlanFromBackendPlanCode; } });
Object.defineProperty(exports, "resolveBillingPlanFromProfilePlanCode", { enumerable: true, get: function () { return plans_1.resolveBillingPlanFromProfilePlanCode; } });
exports.billingPlans = plans_1.sharedBillingPlans.map((plan) => ({
    ...plan,
    accent: plan.id === 'PROFESIONAL'
        ? 'accent'
        : plan.id === 'ENTERPRISE'
            ? 'warm'
            : 'default',
}));
exports.billingPlanById = {
    BASIC: exports.billingPlans[0],
    PROFESIONAL: exports.billingPlans[1],
    ENTERPRISE: exports.billingPlans[2],
};
