export type ProfessionalMercadoPagoConnectionStatus =
  | 'PENDING_AUTHORIZATION'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR'
  | string;

export type ProfessionalMercadoPagoConnection = {
  provider?: string | null;
  status?: ProfessionalMercadoPagoConnectionStatus | null;
  connected: boolean;
  providerAccountId?: string | null;
  providerUserId?: string | null;
  scope?: string | null;
  tokenExpiresAt?: string | null;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
};

export type MercadoPagoOAuthStartResponse = {
  provider?: string | null;
  authorizationUrl?: string | null;
  state?: string | null;
  stateExpiresAt?: string | null;
};
