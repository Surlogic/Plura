"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const professionalReservationActions_1 = require("../../../../../packages/shared/src/bookings/professionalReservationActions");
(0, node_test_1.default)('canProfessionalConfirmReservation only allows pending bookings', () => {
    strict_1.default.equal((0, professionalReservationActions_1.canProfessionalConfirmReservation)('pending'), true);
    strict_1.default.equal((0, professionalReservationActions_1.canProfessionalConfirmReservation)('confirmed'), false);
    strict_1.default.equal((0, professionalReservationActions_1.canProfessionalConfirmReservation)('completed'), false);
    strict_1.default.equal((0, professionalReservationActions_1.canProfessionalConfirmReservation)('cancelled'), false);
    strict_1.default.equal((0, professionalReservationActions_1.canProfessionalConfirmReservation)('no_show'), false);
    strict_1.default.equal((0, professionalReservationActions_1.canProfessionalConfirmReservation)(undefined), false);
});
