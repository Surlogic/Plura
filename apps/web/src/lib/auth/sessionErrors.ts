import { isAxiosError } from 'axios';

const AUTH_FAILURE_STATUSES = new Set([401, 403]);

export const isAuthFailureStatus = (status?: number | null) =>
  typeof status === 'number' && AUTH_FAILURE_STATUSES.has(status);

export const isAuthSessionError = (error: unknown) =>
  isAxiosError(error) && isAuthFailureStatus(error.response?.status);
