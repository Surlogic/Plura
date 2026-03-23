import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
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

type UnsavedState = {
  isDirty: boolean;
  isInternalSaving: boolean;
  savingBySection: Record<string, boolean>;
  saveError: string | null;
  pendingHref: string | null;
  showConfirmModal: boolean;
  showSavingOverlay: boolean;
};

type UnsavedAction =
  | { type: 'SET_DIRTY'; value: boolean }
  | { type: 'SET_INTERNAL_SAVING'; value: boolean }
  | { type: 'SET_SECTION_SAVING'; sectionId: string; saving: boolean }
  | { type: 'SET_SAVE_ERROR'; error: string | null }
  | { type: 'SET_PENDING_HREF'; href: string | null }
  | { type: 'SET_CONFIRM_MODAL'; value: boolean }
  | { type: 'SET_SAVING_OVERLAY'; value: boolean }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_FAIL'; error: string }
  | { type: 'SAVE_END' }
  | { type: 'DISCARD' }
  | { type: 'DISMISS_MODAL' }
  | { type: 'REQUEST_NAV'; href: string }
  | { type: 'BYPASS_NAV' }
  | { type: 'LEAVE_DASHBOARD' };

const initialUnsavedState: UnsavedState = {
  isDirty: false,
  isInternalSaving: false,
  savingBySection: {},
  saveError: null,
  pendingHref: null,
  showConfirmModal: false,
  showSavingOverlay: false,
};

function unsavedReducer(state: UnsavedState, action: UnsavedAction): UnsavedState {
  switch (action.type) {
    case 'SET_DIRTY':
      if (state.isDirty === action.value) return state;
      return {
        ...state,
        isDirty: action.value,
        saveError: action.value ? state.saveError : null,
      };
    case 'SET_INTERNAL_SAVING':
      if (state.isInternalSaving === action.value) return state;
      return { ...state, isInternalSaving: action.value };
    case 'SET_SECTION_SAVING': {
      const wasSaving = Boolean(state.savingBySection[action.sectionId]);
      if (wasSaving === action.saving) return state;
      const next = { ...state.savingBySection };
      if (action.saving) {
        next[action.sectionId] = true;
      } else {
        delete next[action.sectionId];
      }
      return { ...state, savingBySection: next };
    }
    case 'SET_SAVE_ERROR':
      return { ...state, saveError: action.error };
    case 'SET_PENDING_HREF':
      return { ...state, pendingHref: action.href };
    case 'SET_CONFIRM_MODAL':
      return { ...state, showConfirmModal: action.value };
    case 'SET_SAVING_OVERLAY':
      if (state.showSavingOverlay === action.value) return state;
      return { ...state, showSavingOverlay: action.value };
    case 'SAVE_START':
      return { ...state, isInternalSaving: true, saveError: null };
    case 'SAVE_SUCCESS':
      return { ...state, isDirty: false };
    case 'SAVE_FAIL':
      return { ...state, saveError: action.error };
    case 'SAVE_END':
      return { ...state, isInternalSaving: false };
    case 'DISCARD':
      return { ...state, isDirty: false, saveError: null };
    case 'DISMISS_MODAL':
      return { ...state, showConfirmModal: false, pendingHref: null };
    case 'REQUEST_NAV':
      return { ...state, pendingHref: action.href, showConfirmModal: true };
    case 'BYPASS_NAV':
      return { ...state, pendingHref: null, showConfirmModal: false };
    case 'LEAVE_DASHBOARD':
      return {
        ...state,
        isDirty: false,
        isInternalSaving: false,
        saveError: null,
        pendingHref: null,
        showConfirmModal: false,
      };
    default:
      return state;
  }
}

export function ProfessionalDashboardUnsavedChangesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(unsavedReducer, initialUnsavedState);

  const activeSectionIdRef = useRef<string | null>(null);
  const saveHandlerRef = useRef<SaveHandler | undefined>(undefined);
  const resetHandlerRef = useRef<ResetHandler | undefined>(undefined);
  const allowNavigationRef = useRef(false);
  const dirtyRef = useRef(false);

  const currentPath = parsePath(router.asPath || '');
  const isDashboardRoute = isDashboardPath(currentPath);
  const isSaving = useMemo(
    () => state.isInternalSaving || Object.values(state.savingBySection).some((value) => value),
    [state.isInternalSaving, state.savingBySection],
  );

  useEffect(() => {
    dirtyRef.current = state.isDirty;
  }, [state.isDirty]);

  const setDirty = useCallback((value: boolean) => {
    dispatch({ type: 'SET_DIRTY', value });
  }, []);

  const clearSaveError = useCallback(() => {
    dispatch({ type: 'SET_SAVE_ERROR', error: null });
  }, []);

  const setSectionSaving = useCallback((sectionId: string, saving: boolean) => {
    dispatch({ type: 'SET_SECTION_SAVING', sectionId, saving });
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
      dispatch({ type: 'DISCARD' });
      return true;
    }

    dispatch({ type: 'SAVE_START' });

    try {
      const result = await save();
      if (result === false) {
        dispatch({ type: 'SAVE_FAIL', error: 'No se pudieron guardar los cambios.' });
        return false;
      }
      dispatch({ type: 'SAVE_SUCCESS' });
      return true;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'No se pudieron guardar los cambios.';
      dispatch({ type: 'SAVE_FAIL', error: message });
      return false;
    } finally {
      dispatch({ type: 'SAVE_END' });
    }
  }, []);

  const discardCurrentChanges = useCallback(async () => {
    const reset = resetHandlerRef.current;
    if (reset) {
      await reset();
    }
    dispatch({ type: 'DISCARD' });
  }, []);

  const pushWithBypass = useCallback(
    (href: string) => {
      allowNavigationRef.current = true;
      dispatch({ type: 'BYPASS_NAV' });
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
      dispatch({ type: 'REQUEST_NAV', href });
    },
    [isDashboardRoute, router],
  );

  const handleSaveAndExit = useCallback(async () => {
    const target = state.pendingHref;
    if (!target) return;
    const didSave = await saveCurrentSection();
    if (!didSave) return;
    pushWithBypass(target);
  }, [state.pendingHref, pushWithBypass, saveCurrentSection]);

  const handleDiscardAndExit = useCallback(async () => {
    const target = state.pendingHref;
    await discardCurrentChanges();
    if (!target) {
      dispatch({ type: 'SET_CONFIRM_MODAL', value: false });
      return;
    }
    pushWithBypass(target);
  }, [discardCurrentChanges, state.pendingHref, pushWithBypass]);

  const dismissConfirmModal = useCallback(() => {
    dispatch({ type: 'DISMISS_MODAL' });
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
      dispatch({ type: 'REQUEST_NAV', href: nextUrl });
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
      dispatch({ type: 'SET_SAVING_OVERLAY', value: false });
      return;
    }
    const timeoutId = window.setTimeout(() => {
      dispatch({ type: 'SET_SAVING_OVERLAY', value: true });
    }, 180);
    return () => {
      window.clearTimeout(timeoutId);
      dispatch({ type: 'SET_SAVING_OVERLAY', value: false });
    };
  }, [isDashboardRoute, isSaving]);

  useEffect(() => {
    if (isDashboardRoute) return;
    dispatch({ type: 'LEAVE_DASHBOARD' });
  }, [isDashboardRoute]);

  const contextValue = useMemo<ProfessionalDashboardUnsavedChangesContextValue>(
    () => ({
      isDirty: state.isDirty,
      isSaving,
      saveError: state.saveError,
      setDirty,
      clearSaveError,
      setSectionSaving,
      setSectionHandlers,
      clearSectionHandlers,
      saveCurrentSection,
      discardCurrentChanges,
      requestNavigation,
      showSavingOverlay: state.showSavingOverlay,
      showConfirmModal: state.showConfirmModal,
      pendingHref: state.pendingHref,
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
      isSaving,
      requestNavigation,
      saveCurrentSection,
      setDirty,
      setSectionHandlers,
      setSectionSaving,
      state.isDirty,
      state.pendingHref,
      state.saveError,
      state.showConfirmModal,
      state.showSavingOverlay,
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
