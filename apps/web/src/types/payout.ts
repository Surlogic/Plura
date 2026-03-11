import type {
  ProfessionalPayoutConfigBase,
  ProfessionalPayoutConfigUpdateInputBase,
  ProfessionalPayoutStatus,
} from '../../../../packages/shared/src/types/payout';

export type { ProfessionalPayoutStatus };

export type ProfessionalPayoutConfig = ProfessionalPayoutConfigBase & {
  splitCode?: string | null;
  splitPaymentsEnabled: boolean;
};

export type ProfessionalPayoutConfigUpdateInput = ProfessionalPayoutConfigUpdateInputBase & {
  splitCode: string;
};
