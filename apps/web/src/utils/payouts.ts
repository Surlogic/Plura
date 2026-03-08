import type { ProfessionalPayoutConfig } from '@/types/payout';

export const payoutFieldLabels: Record<string, string> = {
  firstName: 'Nombre',
  lastName: 'Apellido',
  country: 'País',
  documentType: 'Tipo de documento',
  documentNumber: 'Número de documento',
  email: 'Email',
  phone: 'Teléfono',
  bank: 'Banco',
  accountNumber: 'Número de cuenta',
  accountType: 'Tipo de cuenta',
  branch: 'Sucursal',
};

const bankingFields = new Set(['bank', 'accountNumber', 'accountType', 'branch']);

export const getPayoutFieldLabel = (field: string) =>
  payoutFieldLabels[field] || field;

export const formatPayoutFieldList = (fields?: string[] | null) =>
  (fields || []).map(getPayoutFieldLabel);

export const getPayoutStatusCopy = (config?: ProfessionalPayoutConfig | null) => {
  const missingFields = config?.missingFields || [];
  const invalidFields = config?.invalidFields || [];
  const hasBankingGap =
    missingFields.some((field) => bankingFields.has(field))
    || invalidFields.some((field) => bankingFields.has(field));

  if (config?.status === 'READY') {
    return {
      badge: 'Listo para cobrar',
      title: 'Tu cuenta está lista para cobrar',
      description: 'Ya cargaste los datos mínimos para recibir payouts del piloto.',
      tone: 'ready' as const,
    };
  }

  if (config?.status === 'ERROR') {
    return {
      badge: 'Error de configuración',
      title: 'Revisá tus datos para poder cobrar',
      description: invalidFields.length > 0
        ? `Hay datos para corregir: ${formatPayoutFieldList(invalidFields).join(', ')}.`
        : 'La configuración necesita revisión antes de poder cobrar.',
      tone: 'error' as const,
    };
  }

  return {
    badge: 'Incompleto',
    title: hasBankingGap ? 'Faltan datos bancarios' : 'Completá tus datos para recibir pagos',
    description: missingFields.length > 0
      ? `Todavía faltan: ${formatPayoutFieldList(missingFields).join(', ')}.`
      : 'Completá los datos mínimos para habilitar tus cobros.',
    tone: 'warning' as const,
  };
};
