import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/router';

type SaveHandler = () => Promise<boolean | void> | boolean | void;
type ResetHandler = () => Promise<void> | void;

type SectionHandlers = {
  id: string;
  save?: SaveHandler;
  reset?: ResetHandler;
};

type UseSectionOptions = {
  sectionId: string;
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: SaveHandler;
  onReset?: ResetHandler;
};

type ProfessionalDashboardUnsavedChangesContextValue = {
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  setDirty: (value: boolean) => void;
  clearSaveError: () => void;
  setSectionSaving: (sectionId: string, saving: boolean) => void;
  setSectionHandlers: (handlers: SectionHandlers) => void;
  clearSectionHandlers: (sectionId: string) => void;
  saveCurrentSection: () => Promise<boolean>;
  discardCurrentChanges: () => Promise<void>;
  requestNavigation: (href: string) => void;
  showSavingOverlay: boolean;
  showConfirmModal: boolean;
  pendingHref: string | null;
  handleSaveAndExit: () => Promise<void>;
  handleDiscardAndExit: () => Promise<void>;
  dismissConfirmModal: () => void;
};

const ProfessionalDashboardUnsavedChangesContext =
  createContext<ProfessionalDashboardUnsavedChangesContextValue | undefined>(
    undefined,
  );

const isDashboardPath = (path: string) => path.startsWith('/profesional/dashboard');

const parsePath = (value: string) => {
  const withoutHash = value.split('#')[0] || value;
  return withoutHash.split('?')[0] || withoutHash;
};

export function ProfessionalDashboardUnsavedChangesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [isInternalSaving, setIsInternalSaving] = useState(false);
  const [savingBySection, setSavingBySection] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSavingOverlay, setShowSavingOverlay] = useState(false);

  const activeSectionIdRef = useRef<string | null>(null);
  const saveHandlerRef = useRef<SaveHandler | undefined>(undefined);
  const resetHandlerRef = useRef<ResetHandler | undefined>(undefined);
  const allowNavigationRef = useRef(false);
  const dirtyRef = useRef(false);

  const currentPath = parsePath(router.asPath || '');
  const isDashboardRoute = isDashboardPath(currentPath);
  const isSaving = useMemo(
    () => isInternalSaving || Object.values(savingBySection).some((value) => value),
    [isInternalSaving, savingBySection],
  );

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  const setDirty = useCallback((value: boolean) => {
    setIsDirty(value);
    if (!value) {
      setSaveError(null);
    }
  }, []);

  const clearSaveError = useCallback(() => {
    setSaveError(null);
  }, []);

  const setSectionSaving = useCallback((sectionId: string, saving: boolean) => {
    setSavingBySection((prev) => {
      const wasSaving = Boolean(prev[sectionId]);
      if (wasSaving === saving) {
        return prev;
      }
      const next = { ...prev };
      if (saving) {
        next[sectionId] = true;
      } else {
        delete next[sectionId];
      }
      return next;
    });
  }, []);

  const setSectionHandlers = useCallback((handlers: SectionHandlers) => {
    activeSectionIdRef.current = handlers.id;
    saveHandlerRef.current = handlers.save;
    resetHandlerRef.current = handlers.reset;
  }, []);

  const clearSectionHandlers = useCallback(
    (sectionId: string) => {
      if (activeSectionIdRef.current === sectionId) {
        activeSectionIdRef.current = null;
        saveHandlerRef.current = undefined;
        resetHandlerRef.current = undefined;
      }
      setSectionSaving(sectionId, false);
    },
    [setSectionSaving],
  );

  const saveCurrentSection = useCallback(async (): Promise<boolean> => {
    const save = saveHandlerRef.current;
    if (!save) {
      setIsDirty(false);
      setSaveError(null);
      return true;
    }

    setIsInternalSaving(true);
    setSaveError(null);

    try {
      const result = await save();
      if (result === false) {
        setSaveError('No se pudieron guardar los cambios.');
        return false;
      }
      setIsDirty(false);
      return true;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'No se pudieron guardar los cambios.';
      setSaveError(message);
      return false;
    } finally {
      setIsInternalSaving(false);
    }
  }, []);

  const discardCurrentChanges = useCallback(async () => {
    const reset = resetHandlerRef.current;
    if (reset) {
      await reset();
    }
    setIsDirty(false);
    setSaveError(null);
  }, []);

  const pushWithBypass = useCallback(
    (href: string) => {
      allowNavigationRef.current = true;
      setPendingHref(null);
      setShowConfirmModal(false);
      void router.push(href);
    },
    [router],
  );

  const requestNavigation = useCallback(
    (href: string) => {
      if (!dirtyRef.current || !isDashboardRoute) {
        void router.push(href);
        return;
      }
      setPendingHref(href);
      setShowConfirmModal(true);
    },
    [isDashboardRoute, router],
  );

  const handleSaveAndExit = useCallback(async () => {
    const target = pendingHref;
    if (!target) return;
    const didSave = await saveCurrentSection();
    if (!didSave) return;
    pushWithBypass(target);
  }, [pendingHref, pushWithBypass, saveCurrentSection]);

  const handleDiscardAndExit = useCallback(async () => {
    const target = pendingHref;
    await discardCurrentChanges();
    if (!target) {
      setShowConfirmModal(false);
      return;
    }
    pushWithBypass(target);
  }, [discardCurrentChanges, pendingHref, pushWithBypass]);

  const dismissConfirmModal = useCallback(() => {
    setShowConfirmModal(false);
    setPendingHref(null);
  }, []);

  useEffect(() => {
    const clearBypass = () => {
      allowNavigationRef.current = false;
    };
    router.events.on('routeChangeComplete', clearBypass);
    router.events.on('routeChangeError', clearBypass);
    return () => {
      router.events.off('routeChangeComplete', clearBypass);
      router.events.off('routeChangeError', clearBypass);
    };
  }, [router.events]);

  useEffect(() => {
    const onRouteChangeStart = (nextUrl: string) => {
      if (allowNavigationRef.current) return;
      if (!dirtyRef.current) return;
      if (!isDashboardPath(parsePath(router.asPath || ''))) return;
      if (nextUrl === router.asPath) return;
      setPendingHref(nextUrl);
      setShowConfirmModal(true);
      router.events.emit('routeChangeError');
      throw 'PLURA_UNSAVED_CHANGES_ABORTED';
    };

    router.events.on('routeChangeStart', onRouteChangeStart);
    return () => {
      router.events.off('routeChangeStart', onRouteChangeStart);
    };
  }, [router, router.events]);

  useEffect(() => {
    if (!isDashboardRoute) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isDashboardRoute]);

  useEffect(() => {
    if (!isDashboardRoute || !isSaving) {
      setShowSavingOverlay(false);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setShowSavingOverlay(true);
    }, 180);
    return () => {
      window.clearTimeout(timeoutId);
      setShowSavingOverlay(false);
    };
  }, [isDashboardRoute, isSaving]);

  useEffect(() => {
    if (isDashboardRoute) return;
    setIsDirty(false);
    setIsInternalSaving(false);
    setSaveError(null);
    setPendingHref(null);
    setShowConfirmModal(false);
  }, [isDashboardRoute]);

  const contextValue = useMemo<ProfessionalDashboardUnsavedChangesContextValue>(
    () => ({
      isDirty,
      isSaving,
      saveError,
      setDirty,
      clearSaveError,
      setSectionSaving,
      setSectionHandlers,
      clearSectionHandlers,
      saveCurrentSection,
      discardCurrentChanges,
      requestNavigation,
      showSavingOverlay,
      showConfirmModal,
      pendingHref,
      handleSaveAndExit,
      handleDiscardAndExit,
      dismissConfirmModal,
    }),
    [
      clearSaveError,
      clearSectionHandlers,
      discardCurrentChanges,
      dismissConfirmModal,
      handleDiscardAndExit,
      handleSaveAndExit,
      isDirty,
      isSaving,
      pendingHref,
      requestNavigation,
      saveCurrentSection,
      saveError,
      setDirty,
      setSectionHandlers,
      setSectionSaving,
      showConfirmModal,
      showSavingOverlay,
    ],
  );

  return (
    <ProfessionalDashboardUnsavedChangesContext.Provider value={contextValue}>
      {children}
    </ProfessionalDashboardUnsavedChangesContext.Provider>
  );
}

export function useProfessionalDashboardUnsavedChanges() {
  const context = useContext(ProfessionalDashboardUnsavedChangesContext);
  if (!context) {
    throw new Error(
      'useProfessionalDashboardUnsavedChanges debe usarse dentro de ProfessionalDashboardUnsavedChangesProvider',
    );
  }
  return context;
}

export function useProfessionalDashboardUnsavedSection({
  sectionId,
  isDirty = false,
  isSaving = false,
  onSave,
  onReset,
}: UseSectionOptions) {
  const context = useProfessionalDashboardUnsavedChanges();
  const {
    setSectionHandlers,
    clearSectionHandlers,
    setDirty,
    setSectionSaving,
  } = context;

  useEffect(() => {
    setSectionHandlers({
      id: sectionId,
      save: onSave,
      reset: onReset,
    });
  }, [onReset, onSave, sectionId, setSectionHandlers]);

  useEffect(
    () => () => {
      clearSectionHandlers(sectionId);
    },
    [clearSectionHandlers, sectionId],
  );

  useEffect(() => {
    setDirty(Boolean(isDirty));
  }, [isDirty, setDirty]);

  useEffect(() => {
    setSectionSaving(sectionId, Boolean(isSaving));
    return () => {
      setSectionSaving(sectionId, false);
    };
  }, [isSaving, sectionId, setSectionSaving]);

  return context;
}
