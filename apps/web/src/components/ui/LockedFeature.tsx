'use client';

import { useState, useRef, type ReactNode } from 'react';
import type { ProfessionalPlanCode } from '../../../../../packages/shared/src/types/professional';
import { hasPlanAccess, PLAN_LABELS } from '../../../../../packages/shared/src/billing/planAccess';
import { cn } from '@/components/ui/cn';

type LockedFeatureProps = {
  children: ReactNode;
  requiredPlan: ProfessionalPlanCode;
  currentPlan?: ProfessionalPlanCode | null;
  className?: string;
};

export default function LockedFeature({
  children,
  requiredPlan,
  currentPlan,
  className,
}: LockedFeatureProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);

  const hasAccess = hasPlanAccess(currentPlan, requiredPlan);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative', className)}>
      <div className="pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute right-3 top-3 z-10">
        <span
          ref={badgeRef}
          className="relative inline-flex cursor-default items-center gap-1.5 rounded-full border border-[color:var(--premium-soft)] bg-[color:var(--premium-soft)] px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--premium-strong)] shadow-sm"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {PLAN_LABELS[requiredPlan]}
          {showTooltip && (
            <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0E2A47] px-3 py-1.5 text-[0.6rem] font-medium normal-case tracking-normal text-white shadow-md">
              Disponible en el plan {PLAN_LABELS[requiredPlan]}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
