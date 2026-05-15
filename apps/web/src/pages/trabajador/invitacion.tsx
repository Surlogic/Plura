import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { isAxiosError } from 'axios';
import AuthTopBar from '@/components/auth/AuthTopBar';
import AuthLoadingOverlay from '@/components/auth/AuthLoadingOverlay';
import Footer from '@/components/shared/Footer';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import api from '@/services/api';

type InvitationLookup = {
  email: string;
  displayName: string;
  professionalId: string | null;
  professionalName: string | null;
  expiresAt: string | null;
  needsAccountCreation: boolean;
};

const resolveQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
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

const formatExpiry = (value: string | null) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('es-UY', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

export default function WorkerInvitationPage() {
  const router = useRouter();
  const token = useMemo(
    () => resolveQueryValue(router.query.token).trim(),
    [router.query.token],
  );

  const [lookup, setLookup] = useState<InvitationLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setErrorMessage('Falta el token de invitación.');
      setLoading(false);
      return;
    }
    const fetchInvitation = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await api.get<InvitationLookup>('/auth/worker-invitations', {
          params: { token },
        });
        setLookup(response.data);
        setForm((prev) => ({ ...prev, fullName: response.data.displayName ?? '' }));
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 410) {
          setErrorMessage('La invitación venció. Pedile al local que te envíe una nueva.');
        } else if (isAxiosError(error) && error.response?.status === 404) {
          setErrorMessage('Invitación no encontrada o ya fue aceptada.');
        } else {
          setErrorMessage(extractApiMessage(error, 'No pudimos cargar la invitación.'));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchInvitation();
  }, [router.isReady, token]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!lookup) return;

    if (lookup.needsAccountCreation) {
      if (!form.fullName.trim()) {
        setErrorMessage('Ingresá tu nombre completo.');
        return;
      }
      if (!form.phoneNumber.trim()) {
        setErrorMessage('Ingresá tu teléfono.');
        return;
      }
      if (form.password.length < 8) {
        setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setErrorMessage('Las contraseñas no coinciden.');
        return;
      }
    }

    try {
      setSubmitting(true);
      await api.post('/auth/worker-invitations/accept', {
        token,
        fullName: lookup.needsAccountCreation ? form.fullName.trim() : undefined,
        phoneNumber: lookup.needsAccountCreation ? form.phoneNumber.trim() : undefined,
        password: lookup.needsAccountCreation ? form.password : undefined,
      });
      setAccepted(true);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 410) {
        setErrorMessage('La invitación venció.');
      } else if (isAxiosError(error) && error.response?.status === 409) {
        setErrorMessage('Ese email ya no está disponible.');
      } else {
        setErrorMessage(extractApiMessage(error, 'No pudimos completar el registro.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formattedExpiry = formatExpiry(lookup?.expiresAt ?? null);

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <AuthTopBar tone="client" />
      <main className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full max-w-md space-y-5">
          <Card tone="default" padding="lg" className="rounded-[32px]">
            <div className="space-y-3">
              <Badge variant="info">Invitación de trabajo</Badge>
              <h1 className="text-2xl font-semibold leading-tight text-[color:var(--ink)]">
                Sumate a tu equipo en Plura
              </h1>
              {lookup ? (
                <p className="text-sm text-[color:var(--ink-muted)]">
                  Te invitaron a gestionar tu agenda y reservas en{' '}
                  <strong>{lookup.professionalName ?? 'el local'}</strong>.
                </p>
              ) : null}
              {formattedExpiry ? (
                <p className="text-xs text-[color:var(--ink-muted)]">
                  La invitación vence el {formattedExpiry}.
                </p>
              ) : null}
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-[color:var(--ink-muted)]">Cargando invitación…</p>
            ) : null}

            {!loading && errorMessage && !accepted ? (
              <div className="mt-6 space-y-3">
                <p className="rounded-[12px] border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] px-3 py-2 text-xs text-[color:var(--error)]">
                  {errorMessage}
                </p>
                <Link
                  href="/login"
                  className="text-xs font-semibold text-[color:var(--accent-strong)] underline underline-offset-4"
                >
                  Volver al inicio
                </Link>
              </div>
            ) : null}

            {!loading && lookup && !accepted ? (
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">Email</label>
                  <input
                    className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--background-alt)]/80 px-4 text-sm text-[color:var(--ink)]"
                    value={lookup.email}
                    disabled
                  />
                </div>

                {lookup.needsAccountCreation ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[color:var(--ink)]">Nombre completo</label>
                      <input
                        className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)]"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[color:var(--ink)]">Teléfono</label>
                      <input
                        className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)]"
                        name="phoneNumber"
                        value={form.phoneNumber}
                        onChange={handleChange}
                        placeholder="+598..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[color:var(--ink)]">Contraseña</label>
                      <input
                        className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)]"
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Mínimo 8 caracteres"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[color:var(--ink)]">Confirmar contraseña</label>
                      <input
                        className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)]"
                        type="password"
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[color:var(--ink-muted)]">
                    Ya tenés cuenta en Plura con este email. Aceptá la invitación para conectar tu cuenta como
                    trabajador del local.
                  </p>
                )}

                {errorMessage ? (
                  <p className="rounded-[12px] border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] px-3 py-2 text-xs text-[color:var(--error)]">
                    {errorMessage}
                  </p>
                ) : null}

                <Button type="submit" variant="brand" size="lg" className="w-full" disabled={submitting}>
                  {submitting
                    ? 'Procesando...'
                    : lookup.needsAccountCreation
                      ? 'Crear cuenta y aceptar'
                      : 'Aceptar invitación'}
                </Button>
              </form>
            ) : null}

            {accepted ? (
              <div className="mt-6 space-y-4">
                <p className="rounded-[12px] border border-[#cdeee9] bg-[#f0fffc] px-3 py-2 text-xs text-[#1FB6A6]">
                  ¡Listo! Aceptaste la invitación. Iniciá sesión con tu email para entrar a tu agenda.
                </p>
                <Link
                  href="/login"
                  className="inline-flex h-12 w-full items-center justify-center rounded-[18px] bg-[color:var(--accent)] px-4 text-sm font-semibold text-white"
                >
                  Ir a iniciar sesión
                </Link>
              </div>
            ) : null}
          </Card>
        </div>
      </main>
      <AuthLoadingOverlay
        visible={submitting}
        title="Activando tu acceso"
        description="Estamos guardando los datos de tu cuenta de trabajador."
      />
      <Footer />
    </div>
  );
}
