import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearInternalOpsAccess,
  configureInternalOpsAccess,
  getDefaultInternalOpsBaseUrl,
  hasInternalOpsAccess,
  isInternalOpsOriginAllowed,
} from './internalOps';

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
    clear: () => values.clear(),
  };
};

test('internal ops access stays in memory and rejects unallowed origins', () => {
  const localStorage = createStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: localStorage,
  });

  clearInternalOpsAccess();

  const baseUrl = getDefaultInternalOpsBaseUrl();
  assert.equal(isInternalOpsOriginAllowed(baseUrl), true);

  configureInternalOpsAccess({ baseUrl, token: ' internal-secret ' });

  assert.equal(hasInternalOpsAccess(), true);
  assert.equal(localStorage.getItem('plura_ops_api_url'), null);
  assert.equal(localStorage.getItem('plura_ops_token'), null);
  assert.throws(
    () => configureInternalOpsAccess({ baseUrl: 'https://evil.example', token: 'internal-secret' }),
    /no permitida/,
  );

  clearInternalOpsAccess();
  assert.equal(hasInternalOpsAccess(), false);
});
