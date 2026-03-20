import test from 'node:test';
import assert from 'node:assert/strict';
import { openCheckoutUrl } from './checkoutWindow';

type WindowOpenStub = (
  url?: string,
  target?: string,
  features?: string,
) => { focus?: () => void } | null;

const originalWindow = globalThis.window;

const setWindowMock = (open: WindowOpenStub, assign?: (url: string) => void) => {
  const locationAssign = assign ?? (() => undefined);
  const windowMock = {
    open,
    location: {
      assign: locationAssign,
    },
    screen: {
      availWidth: 1440,
      availHeight: 900,
    },
    screenX: 50,
    outerWidth: 1440,
    outerHeight: 900,
  } as unknown as Window & typeof globalThis;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: windowMock,
  });
};

test.afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: originalWindow,
  });
});

test('openCheckoutUrl navigates in the current tab', () => {
  const opened: Array<{ url?: string; target?: string; features?: string }> = [];
  let assignedUrl: string | null = null;

  setWindowMock((url, target, features) => {
    opened.push({ url, target, features });
    return null;
  }, (url) => {
    assignedUrl = url;
  });

  const result = openCheckoutUrl('https://www.mercadopago.com/checkout/v1');

  assert.equal(result, 'current-tab');
  assert.equal(assignedUrl, 'https://www.mercadopago.com/checkout/v1');
  assert.equal(opened.length, 0);
});

test('openCheckoutUrl returns blocked when current-tab navigation fails', () => {
  setWindowMock(() => null, () => {
    throw new Error('navigation blocked');
  });

  const result = openCheckoutUrl('https://www.mercadopago.com/checkout/v2');

  assert.equal(result, 'blocked');
});
