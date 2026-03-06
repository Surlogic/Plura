import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';

type AuthTopBarProps = {
  tone: 'professional' | 'client';
};

const toneStyles = {
  professional: {
    header: 'border-white/10 bg-[#0A1424]/90',
    brand: 'text-[#E8EEF7]',
    action:
      'border-white/20 text-[#E8EEF7] hover:border-[#2AA5A0]/60 hover:text-[#8AF0E8] focus-visible:ring-[#2AA5A0]/40',
  },
  client: {
    header: 'border-[#0E2A47]/10 bg-white/85',
    brand: 'text-[#0E2A47]',
    action:
      'border-[#0E2A47]/15 text-[#0E2A47] hover:border-[#0E2A47]/30 hover:bg-[#F8FAFC] focus-visible:ring-[#0E2A47]/25',
  },
} as const;

export default function AuthTopBar({ tone }: AuthTopBarProps) {
  const styles = toneStyles[tone];

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur ${styles.header}`}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo href="/" size={38} priority textClassName={styles.brand} />
        <Button
          href="/"
          variant={tone === 'professional' ? 'contrast' : 'secondary'}
          size="sm"
          className={styles.action}
        >
          Volver al inicio
        </Button>
      </div>
    </header>
  );
}
