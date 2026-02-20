'use client';

import { useState } from 'react';
import api from '@/services/api';

export default function Home() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const { data } = await api.get<{ status?: string }>('/health');
      setStatus(data?.status ?? 'ok');
    } catch {
      setError('No se pudo conectar con el backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">Plura</h1>
        <p className="text-slate-300">Monorepo preparado para escalar.</p>

        <button
          onClick={checkHealth}
          className="px-6 py-3 rounded-md bg-white text-slate-950 font-semibold hover:bg-slate-200 transition"
          disabled={loading}
        >
          {loading ? 'Consultando...' : 'Probar /health'}
        </button>

        {status && (
          <p className="text-emerald-400">Backend OK: {status}</p>
        )}
        {error && (
          <p className="text-red-400">{error}</p>
        )}
      </div>
    </main>
  );
}
