import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInternationalPhoneNumber,
  isValidInternationalPhoneNumber,
  sanitizePhoneLocalNumber,
  splitInternationalPhoneNumber,
  validateInternationalPhoneNumber,
} from './internationalPhone';

test('sanitizePhoneLocalNumber conserva solo digitos y limita la longitud', () => {
  assert.equal(sanitizePhoneLocalNumber('11 2345-6789'), '1123456789');
  assert.equal(sanitizePhoneLocalNumber('+54 (11) 2345 6789 ext 22'), '54112345678922');
  assert.equal(sanitizePhoneLocalNumber('12345678901234567890'), '123456789012345');
});

test('buildInternationalPhoneNumber arma el telefono con el codigo del pais', () => {
  assert.equal(buildInternationalPhoneNumber('AR', '11 2345 6789'), '+541123456789');
  assert.equal(buildInternationalPhoneNumber('UY', '99 123 456'), '+59899123456');
  assert.equal(buildInternationalPhoneNumber('UY', ''), '');
});

test('splitInternationalPhoneNumber detecta el pais por prefijo internacional', () => {
  assert.deepEqual(splitInternationalPhoneNumber('+59899123456'), {
    countryCode: 'UY',
    nationalNumber: '99123456',
  });
  assert.deepEqual(splitInternationalPhoneNumber('+541123456789'), {
    countryCode: 'AR',
    nationalNumber: '1123456789',
  });
});

test('splitInternationalPhoneNumber cae al pais por defecto cuando no reconoce el prefijo', () => {
  assert.deepEqual(splitInternationalPhoneNumber('099123456'), {
    countryCode: 'UY',
    nationalNumber: '099123456',
  });
  assert.deepEqual(splitInternationalPhoneNumber('', 'AR'), {
    countryCode: 'AR',
    nationalNumber: '',
  });
});

test('splitInternationalPhoneNumber conserva el pais elegido si comparte dial code con otros', () => {
  assert.deepEqual(splitInternationalPhoneNumber('+14165550123', 'CA'), {
    countryCode: 'CA',
    nationalNumber: '4165550123',
  });
});

test('validateInternationalPhoneNumber valida longitud nacional exacta por pais', () => {
  assert.equal(isValidInternationalPhoneNumber('+59899123456'), true);
  assert.equal(isValidInternationalPhoneNumber('+5989912345'), false);
  assert.equal(isValidInternationalPhoneNumber('+598991234567'), false);
  assert.equal(isValidInternationalPhoneNumber('+541123456789'), true);

  assert.deepEqual(validateInternationalPhoneNumber('+5989912345'), {
    valid: false,
    countryCode: 'UY',
    nationalNumber: '9912345',
    expectedLength: 8,
    actualLength: 7,
    exampleNational: '99 123 456',
  });
});
