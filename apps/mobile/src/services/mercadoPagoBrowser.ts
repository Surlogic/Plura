import * as WebBrowser from 'expo-web-browser';

const ALLOWED_MERCADO_PAGO_ORIGINS = [
  'https://www.mercadopago.com',
  'https://www.mercadopago.com.uy',
  'https://www.mercadopago.com.ar',
  'https://sandbox.mercadopago.com',
  'https://sandbox.mercadopago.com.uy',
  'https://sandbox.mercadopago.com.ar',
];

export const isAllowedMercadoPagoUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ALLOWED_MERCADO_PAGO_ORIGINS.some((origin) => parsed.origin === origin);
  } catch {
    return false;
  }
};

export const openMercadoPagoInAppBrowser = async (url: string) => {
  if (!isAllowedMercadoPagoUrl(url)) {
    throw new Error('URL de Mercado Pago no permitida');
  }

  return WebBrowser.openBrowserAsync(url, {
    controlsColor: '#0A7A43',
    toolbarColor: '#FFFFFF',
    enableBarCollapsing: true,
    showTitle: false,
  });
};
