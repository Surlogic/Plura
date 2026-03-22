import { memo } from 'react';
import { useProfessionalDashboardUnsavedChanges } from '@/context/ProfessionalDashboardUnsavedChangesContext';

type UnsavedChangesOverlayProps = {
  isDashboardRoute: boolean;
};

function UnsavedChangesOverlayInner({ isDashboardRoute }: UnsavedChangesOverlayProps) {
  const {
    isDirty,
    isSaving,
    saveError,
    saveCurrentSection,
    showSavingOverlay,
    showConfirmModal,
    pendingHref,
    handleSaveAndExit,
    handleDiscardAndExit,
    dismissConfirmModal,
  } = useProfessionalDashboardUnsavedChanges();

  if (!isDashboardRoute) return null;

  return (
    <>
      {showSavingOverlay ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0B1D2A]/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-[28px] bg-white px-10 py-8 shadow-[0_28px_70px_rgba(15,23,42,0.25)]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E2E7EC] border-t-[#1FB6A6]" />
            <p className="text-sm font-semibold text-[#0E2A47]">Guardando cambios...</p>
          </div>
        </div>
      ) : null}

      {isDirty && !isSaving ? (
        <div className="fixed bottom-6 right-6 z-[110] flex flex-col items-end gap-2">
          {saveError ? (
            <div className="rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1 text-xs font-semibold text-[#DC2626]">
              {saveError}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void saveCurrentSection();
            }}
            className="rounded-full bg-[#0B1D2A] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(11,29,42,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(11,29,42,0.32)]"
          >
            Guardar cambios
          </button>
        </div>
      ) : null}

      {showConfirmModal ? (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-[#0B1D2A]/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-[28px] bg-white p-7 shadow-[0_28px_70px_rgba(15,23,42,0.25)]">
            <h3 className="text-lg font-semibold text-[#0E2A47]">Cambios sin guardar</h3>
            <p className="mt-2 text-sm text-[#64748B]">¿Querés guardar antes de salir?</p>
            <p className="mt-1 text-sm text-[#64748B]">Tenés cambios sin guardar.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleSaveAndExit();
                }}
                className="flex-1 rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Guardar y salir
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDiscardAndExit();
                }}
                className="flex-1 rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-semibold text-[#DC2626] transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                Descartar cambios
              </button>
              <button
                type="button"
                onClick={dismissConfirmModal}
                className="w-full rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const UnsavedChangesOverlay = memo(UnsavedChangesOverlayInner);
export default UnsavedChangesOverlay;
