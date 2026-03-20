const CHECKOUT_LOADING_HTML = `
  <div style="font-family:system-ui,sans-serif;padding:24px;line-height:1.5">
    <h1 style="font-size:18px;margin:0 0 8px">Preparando checkout seguro...</h1>
    <p style="margin:0;color:#475569">En unos segundos te redirigimos al proveedor de pago.</p>
  </div>
`;

export const openCheckoutWindow = (): Window | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const checkoutWindow = window.open('', '_blank');
  if (!checkoutWindow) {
    return null;
  }

  try {
    checkoutWindow.opener = null;
    checkoutWindow.document.title = 'Preparando checkout';
    checkoutWindow.document.body.innerHTML = CHECKOUT_LOADING_HTML;
  } catch {
    // Ignore browsers that restrict document access during popup creation.
  }

  return checkoutWindow;
};

export const redirectCheckoutWindow = (
  checkoutWindow: Window | null,
  checkoutUrl: string,
): boolean => {
  if (!checkoutWindow || checkoutWindow.closed) {
    return false;
  }

  try {
    checkoutWindow.opener = null;
    checkoutWindow.location.replace(checkoutUrl);
    return true;
  } catch {
    return false;
  }
};

export const closeCheckoutWindow = (checkoutWindow: Window | null) => {
  if (!checkoutWindow || checkoutWindow.closed) {
    return;
  }

  checkoutWindow.close();
};

export const openCheckoutUrl = (checkoutUrl: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.open(checkoutUrl, '_blank', 'noopener,noreferrer'));
};
