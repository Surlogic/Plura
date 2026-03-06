import { useEffect, useState, type ReactNode } from 'react';
import ClientDashboardNavbar from '@/components/dashboard/ClientDashboardNavbar';
import Footer from '@/components/shared/Footer';
import ClientSidebar, { type ClientSidebarSection } from '@/components/cliente/ClientSidebar';

type ClientShellProps = {
  name: string;
  active: ClientSidebarSection;
  children: ReactNode;
};

const SIDEBAR_STATE_KEY = 'plura:client-sidebar-collapsed';

export default function ClientShell({ name, active, children }: ClientShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarStateHydrated, setIsSidebarStateHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedValue = window.localStorage.getItem(SIDEBAR_STATE_KEY);
    if (storedValue === 'true') setIsSidebarCollapsed(true);
    setIsSidebarStateHydrated(true);
  }, []);

  useEffect(() => {
    if (!isSidebarStateHydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STATE_KEY, isSidebarCollapsed ? 'true' : 'false');
  }, [isSidebarCollapsed, isSidebarStateHydrated]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(238,244,242,0.8))] text-[color:var(--ink)]">
      <div>
        <ClientDashboardNavbar name={name} onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
        <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-10 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <aside
              className={`hidden shrink-0 transition-[width] duration-300 lg:block ${
                isSidebarCollapsed ? 'w-[82px]' : 'w-[220px]'
              }`}
            >
              <div className="sticky top-28">
                <ClientSidebar
                  active={active}
                  collapsed={isSidebarCollapsed}
                  onToggleCollapsed={() => setIsSidebarCollapsed((prev) => !prev)}
                />
              </div>
            </aside>

            <div className="min-w-0 flex-1 space-y-8">
              {children}
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="absolute inset-0 bg-[color:var(--primary-strong)]/38 backdrop-blur-[3px]"
            aria-label="Cerrar menu cliente"
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-[color:var(--border-soft)] bg-[color:var(--surface-strong)]/96 p-4 shadow-[var(--shadow-lift)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">Panel cliente</p>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white text-[color:var(--ink)]"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <ClientSidebar active={active} mobile onNavigate={() => setIsMobileSidebarOpen(false)} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
