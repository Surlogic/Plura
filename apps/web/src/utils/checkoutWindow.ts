export type CheckoutOpenResult = 'current-tab' | 'blocked';

export const openCheckoutUrl = (checkoutUrl: string): CheckoutOpenResult => {
  if (typeof window === 'undefined') {
    return 'blocked';
  }

  try {
    window.location.assign(checkoutUrl);
    return 'current-tab';
  } catch {
    return 'blocked';
  }
};
