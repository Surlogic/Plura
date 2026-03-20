import test from 'node:test';
import assert from 'node:assert/strict';
import type { BookingPaymentSession } from '@/types/bookings';
import {
  getBookingPaymentSessionFeedback,
  getBookingPaymentSessionMessage,
} from './paymentSession';

test('getBookingPaymentSessionFeedback returns info when checkout must continue in Mercado Pago', () => {
  const feedback = getBookingPaymentSessionFeedback({
    checkoutUrl: 'https://mercadopago.test/checkout',
    financialStatus: 'PAYMENT_PENDING',
  } as BookingPaymentSession);

  assert.equal(feedback.tone, 'info');
  assert.equal(feedback.title, 'Abrimos Mercado Pago');
  assert.match(feedback.description, /Mercado Pago/);
});

test('getBookingPaymentSessionFeedback returns error when provider marks the payment as failed', () => {
  const feedback = getBookingPaymentSessionFeedback({
    financialStatus: 'FAILED',
  } as BookingPaymentSession);

  assert.equal(feedback.tone, 'error');
  assert.equal(feedback.title, 'No pudimos continuar el pago');
});

test('getBookingPaymentSessionMessage keeps returning the feedback description', () => {
  const session = {
    financialStatus: 'RELEASED',
  } as BookingPaymentSession;

  assert.equal(
    getBookingPaymentSessionMessage(session),
    getBookingPaymentSessionFeedback(session).description,
  );
});
