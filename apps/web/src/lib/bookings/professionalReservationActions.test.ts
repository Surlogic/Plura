import test from 'node:test';
import assert from 'node:assert/strict';
import { canProfessionalConfirmReservation } from '../../../../../packages/shared/src/bookings/professionalReservationActions';

test('canProfessionalConfirmReservation only allows pending bookings', () => {
  assert.equal(canProfessionalConfirmReservation('pending'), true);
  assert.equal(canProfessionalConfirmReservation('confirmed'), false);
  assert.equal(canProfessionalConfirmReservation('completed'), false);
  assert.equal(canProfessionalConfirmReservation('cancelled'), false);
  assert.equal(canProfessionalConfirmReservation('no_show'), false);
  assert.equal(canProfessionalConfirmReservation(undefined), false);
});
