/** Backend originale (Emergent). Si può sostituire con EXPO_PUBLIC_API_URL. */
export const API: string = process.env.EXPO_PUBLIC_API_URL || 'https://offline-app-26.emergent.host/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type FetchOptions = { method?: string; body?: unknown; token?: string | null };

export async function apiFetch<T = any>(path: string, opts: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.ok) return res.json();

  let message = 'Si è verificato un errore';
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') message = data.detail;
    else if (Array.isArray(data?.detail)) message = 'Controlla i dati inseriti';
  } catch {
    // risposta senza JSON
  }
  throw new ApiError(res.status, message);
}
