import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { AxiosHeaders } from 'axios';
import { isAuthFailureStatus, isAuthSessionError } from './sessionErrors';

test('isAuthFailureStatus solo trata 401 y 403 como auth failure', () => {
  assert.equal(isAuthFailureStatus(401), true);
  assert.equal(isAuthFailureStatus(403), true);
  assert.equal(isAuthFailureStatus(400), false);
  assert.equal(isAuthFailureStatus(500), false);
  assert.equal(isAuthFailureStatus(undefined), false);
});

test('isAuthSessionError detecta errores axios con 401 o 403', () => {
  const unauthorizedError = axios.AxiosError.from(
    new Error('unauthorized'),
    undefined,
    undefined,
    undefined,
    {
      data: {},
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: AxiosHeaders.from({}) },
    },
  );
  const serverError = axios.AxiosError.from(
    new Error('server'),
    undefined,
    undefined,
    undefined,
    {
      data: {},
      status: 500,
      statusText: 'Server Error',
      headers: {},
      config: { headers: AxiosHeaders.from({}) },
    },
  );

  assert.equal(isAuthSessionError(unauthorizedError), true);
  assert.equal(isAuthSessionError(serverError), false);
  assert.equal(isAuthSessionError(new Error('plain')), false);
});
