import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { isAxiosError } from 'axios';
import AuthTopBar from '@/components/auth/AuthTopBar';
import AuthLoadingOverlay from '@/components/auth/AuthLoadingOverlay';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import Footer from '@/components/shared/Footer';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import api from '@/services/api';
import { setAuthAccessToken, setKnownAuthSessionRole } from '@/services/session';
import type { OAuthLoginResult } from '@/lib/auth/oauthLogin';

type AuthContextType = 'CLIENT' | 'PROFESSIONAL' | 'WORKER';

type AuthContextDescriptor = {
  type: AuthContextType;
  professionalId?: string | null;
  professionalName?: string | null;
  professionalSlug?: string | null;
  workerId?: string | null;
  workerDisplayName?: string | null;
  owner?: boolean;
};

type UnifiedLoginResponse = {
  accessToken?: string | null;
  refreshToken?: string | null;
  activeContext?: AuthContextDescriptor | null;
  contexts?: AuthContextDescriptor[];
  contextSelectionRequired?: boolean;
};

type SelectContextResponse = {
  accessToken?: string | null;
  activeContext?: AuthContextDescriptor | null;
};

type AuthMeResponse = {
  activeContext?: AuthContextDescriptor | null;
  contexts?: AuthContextDescriptor[];
};

const extractApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim();
    }
    if (responseData && typeof responseData === 'object') {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
  }
  return fallback;
};

const sessionRoleForContext = (type: AuthContextType): 'CLIENT' | 'PROFESSIONAL' | 'WORKER' => {
  switch (type) {
    case 'PROFESSIONAL':
      return 'PROFESSIONAL';
    case 'WORKER':
      return 'WORKER';
    default:
      return 'CLIENT';
  }
};

const dashboardForContext = (descriptor: AuthContextDescriptor): string => {
  switch (descriptor.type) {
    case 'PROFESSIONAL':
      return '/profesional/dashboard';
    case 'WORKER':
      return '/trabajador/calendario';
    default:
      return '/cliente/inicio';
  }
};

const contextLabel = (descriptor: AuthContextDescriptor): string => {
  switch (descriptor.type) {
    case 'PROFESSIONAL':
      return descriptor.professionalName
        ? `Administrar ${descriptor.professionalName}`
        : 'Administrar mi local';
    case 'WORKER':
      return descriptor.professionalName
        ? `Trabajar en ${descriptor.professionalName}`
        : 'Entrar como trabajador';
    default:
      return 'Reservar como cliente';
  }
};

const contextDescription = (descriptor: AuthContextDescriptor): string => {
  switch (descriptor.type) {
    case 'PROFESSIONAL':
      return 'Acceso al dashboard del local: agenda, reservas, equipo y configuración.';
    case 'WORKER':
      return descriptor.workerDisplayName
        ? `Tu agenda y reservas asignadas como ${descriptor.workerDisplayName}.`
        : 'Tu agenda y reservas asignadas en este local.';
    default:
      return 'Buscar profesionales y reservar tus turnos.';
  }
};

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contexts, setContexts] = useState<AuthContextDescriptor[] | null>(null);
  const [selectingContext, setSelectingContext] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const normalizedValue = name === 'email' ? value.toLowerCase() : value;
    setForm((prev) => ({ ...prev, [name]: normalizedValue }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    try {
      setIsSubmitting(true);
      const response = await api.post<UnifiedLoginResponse>('/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      const data = response.data ?? {};
      if (data.accessToken) {
        const role = data.activeContext
          ? sessionRoleForContext(data.activeContext.type)
          : 'CLIENT';
        setAuthAccessToken(data.accessToken, role);
      }
      const list = Array.isArray(data.contexts) ? data.contexts : [];
      if (data.contextSelectionRequired && list.length > 1) {
        setContexts(list);
        return;
      }
      if (data.activeContext) {
        setKnownAuthSessionRole(sessionRoleForContext(data.activeContext.type));
        router.push(dashboardForContext(data.activeContext));
        return;
      }
      router.push('/cliente/inicio');
    } catch (error) {
      setErrorMessage(extractApiMessage(error, 'Credenciales inválidas o error de servidor.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthAuthenticated = async (result: OAuthLoginResult) => {
    setErrorMessage(null);
    if (result.role === 'PROFESSIONAL') {
      setKnownAuthSessionRole('PROFESSIONAL');
    } else if (result.role === 'USER') {
      setKnownAuthSessionRole('CLIENT');
    }
    try {
      const response = await api.get<AuthMeResponse>('/auth/me');
      const data = response.data ?? {};
      const list = Array.isArray(data.contexts) ? data.contexts : [];
      if (list.length > 1) {
        setContexts(list);
        return;
      }
      if (data.activeContext) {
        setKnownAuthSessionRole(sessionRoleForContext(data.activeContext.type));
        router.push(dashboardForContext(data.activeContext));
        return;
      }
      router.push('/cliente/inicio');
    } catch (error) {
      if (result.role === 'PROFESSIONAL') {
        router.push('/profesional/dashboard');
      } else {
        router.push('/cliente/inicio');
      }
    }
  };

  const handleSelect = async (descriptor: AuthContextDescriptor) => {
    setErrorMessage(null);
    const key = `${descriptor.type}-${descriptor.workerId ?? descriptor.professionalId ?? 'self'}`;
    try {
      setSelectingContext(key);
      const response = await api.post<SelectContextResponse>('/auth/context/select', {
        type: descriptor.type,
        workerId: descriptor.workerId ?? undefined,
        professionalId: descriptor.professionalId ?? undefined,
      });
      const data = response.data ?? {};
      const active = data.activeContext ?? descriptor;
      if (data.accessToken) {
        setAuthAccessToken(data.accessToken, sessionRoleForContext(active.type));
      } else {
        setKnownAuthSessionRole(sessionRoleForContext(active.type));
      }
      router.push(dashboardForContext(active));
    } catch (error) {
      setErrorMessage(extractApiMessage(error, 'No pudimos cambiar de contexto.'));
    } finally {
      setSelectingContext(null);
    }
  };

  const inputClassName =
    'h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] transition focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <AuthTopBar tone="client" />
      <main className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full max-w-md space-y-5">
          <Card tone="default" padding="lg" className="rounded-[32px]">
            {!contexts ? (
              <>
                <div className="space-y-3">
                  <Badge variant="info">Acceso a Plura</Badge>
                  <h1 className="text-3xl font-semibold leading-tight text-[color:var(--ink)]">
                    Iniciar sesión
                  </h1>
                  <p className="text-sm text-[color:var(--ink-muted)]">
                    Ingresá con tu cuenta. Si tenés varios accesos, vas a poder elegir cómo continuar.
                  </p>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[color:var(--ink)]">Email</label>
                    <input
                      className={inputClassName}
                      placeholder="tucorreo@ejemplo.com"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[color:var(--ink)]">Contraseña</label>
                    <input
                      type="password"
                      className={inputClassName}
                      placeholder="••••••••"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                    <div className="flex justify-end">
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs font-semibold text-[color:var(--accent-strong)] underline underline-offset-4"
                      >
                        Olvidé mi contraseña
                      </Link>
                    </div>
                  </div>

                  {errorMessage ? (
                    <p className="rounded-[12px] border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] px-3 py-2 text-xs text-[color:var(--error)]">
                      {errorMessage}
                    </p>
                  ) : null}

                  <Button type="submit" variant="brand" size="lg" className="w-full" disabled={isSubmitting || isGoogleLoading}>
                    {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
                  </Button>
                </form>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                      o continuar con
                    </span>
                    <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
                  </div>
                  <GoogleLoginButton
                    onAuthenticated={handleOAuthAuthenticated}
                    onError={(message) => setErrorMessage(message)}
                    onLoadingChange={setIsGoogleLoading}
                    authAction="LOGIN"
                    buttonLabel="Continuar con Google"
                    loadingLabel="Iniciando..."
                  />
                </div>

                <p className="mt-6 text-center text-xs text-[color:var(--ink-muted)]">
                  ¿No tenés cuenta?{' '}
                  <Link
                    href="/cliente/auth/register"
                    className="font-semibold text-[color:var(--accent-strong)] underline decoration-[color:var(--accent-soft)] underline-offset-4"
                  >
                    Crear cuenta cliente
                  </Link>
                  {' · '}
                  <Link
                    href="/profesional/auth/register"
                    className="font-semibold text-[color:var(--accent-strong)] underline decoration-[color:var(--accent-soft)] underline-offset-4"
                  >
                    Cuenta profesional
                  </Link>
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <Badge variant="info">Elegí cómo continuar</Badge>
                <h2 className="text-2xl font-semibold leading-tight text-[color:var(--ink)]">
                  ¿Con qué cuenta querés entrar?
                </h2>
                <p className="text-sm text-[color:var(--ink-muted)]">
                  Tu email tiene varios accesos en Plura. Elegí uno para continuar.
                </p>

                {errorMessage ? (
                  <p className="rounded-[12px] border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] px-3 py-2 text-xs text-[color:var(--error)]">
                    {errorMessage}
                  </p>
                ) : null}

                <div className="grid gap-3">
                  {contexts.map((descriptor) => {
                    const key = `${descriptor.type}-${descriptor.workerId ?? descriptor.professionalId ?? 'self'}`;
                    const busy = selectingContext === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelect(descriptor)}
                        disabled={busy}
                        className="group flex flex-col gap-1 rounded-[22px] border border-[color:var(--border-soft)] bg-white/90 px-4 py-3 text-left transition hover:border-[color:var(--accent)] hover:shadow-md disabled:opacity-60"
                      >
                        <span className="text-sm font-semibold text-[color:var(--ink)]">
                          {contextLabel(descriptor)}
                        </span>
                        <span className="text-xs text-[color:var(--ink-muted)]">
                          {contextDescription(descriptor)}
                        </span>
                        {busy ? (
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-strong)]">
                            Cargando…
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="text-xs font-semibold text-[color:var(--accent-strong)] underline underline-offset-4"
                  onClick={() => {
                    setContexts(null);
                    setForm((prev) => ({ ...prev, password: '' }));
                  }}
                >
                  Volver al login
                </button>
              </div>
            )}
          </Card>
        </div>
      </main>
      <AuthLoadingOverlay
        visible={isSubmitting || isGoogleLoading || Boolean(selectingContext)}
        title={selectingContext ? 'Cambiando de contexto' : 'Iniciando sesión'}
        description={
          isGoogleLoading
            ? 'Conectando tu cuenta de Google.'
            : 'Validando credenciales y preparando tu acceso.'
        }
      />
      <Footer />
    </div>
  );
}
