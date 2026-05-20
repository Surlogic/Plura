import test from 'node:test';
import assert from 'node:assert/strict';

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
};

const installWindowMock = () => {
  const localStorage = createStorage();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      localStorage,
      addEventListener: () => undefined,
      atob: (value: string) => Buffer.from(value, 'base64').toString('binary'),
    },
  });
  return localStorage;
};

const base64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const tokenWithPayload = (payload: unknown) => `header.${base64Url(payload)}.signature`;

test('auth session keeps access token out of localStorage and sync payloads', async () => {
  const localStorage = installWindowMock();
  const session = await import('./session');
  const token = tokenWithPayload({
    ctx: 'CLIENT',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  session.clearAuthAccessToken();
  session.setAuthAccessToken(token, 'CLIENT');

  assert.equal(localStorage.getItem('plura_access_token_fallback'), null);
  assert.equal(session.getAuthAccessToken(), token);
  assert.equal(localStorage.getItem('plura_auth_session_hint'), '1');
  assert.equal(localStorage.getItem('plura_auth_session_role'), 'CLIENT');
  assert.equal(localStorage.getItem('plura_auth_session_sync_event')?.includes(token), false);

  session.clearAuthAccessToken();
});

test('auth session migrates legacy stored token into hint only', async () => {
  const localStorage = installWindowMock();
  const session = await import('./session');
  const token = tokenWithPayload({
    ctx: 'PROFESSIONAL',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  session.clearAuthAccessToken();
  localStorage.setItem('plura_access_token_fallback', token);
  const snapshot = session.getCurrentAuthSessionSnapshot();

  assert.equal(localStorage.getItem('plura_access_token_fallback'), null);
  assert.equal(snapshot.accessToken, null);
  assert.equal(snapshot.hasSessionHint, true);
  assert.equal(snapshot.role, 'PROFESSIONAL');
  assert.equal(localStorage.getItem('plura_auth_session_hint'), '1');
  assert.equal(localStorage.getItem('plura_auth_session_role'), 'PROFESSIONAL');

  session.clearAuthAccessToken();
});
