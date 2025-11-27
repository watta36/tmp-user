const kvBaseUrl = () => (process.env.KV_REST_API_URL ?? '').replace(/\/$/, '');

const AUTH_HEADER = () => ({ Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` });

function mergeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return { ...AUTH_HEADER() };
  if (headers instanceof Headers) return Object.fromEntries([...headers.entries(), ...Object.entries(AUTH_HEADER())]);
  if (Array.isArray(headers)) return Object.fromEntries([...headers, ...Object.entries(AUTH_HEADER())]);
  return { ...(headers as Record<string, string>), ...AUTH_HEADER() };
}

export const hasKvEnv = () => ['KV_REST_API_URL', 'KV_REST_API_TOKEN'].every((key) => !!process.env[key]);

async function kvFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!hasKvEnv()) return null;
  const base = kvBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/${path}`, {
      ...init,
      headers: mergeHeaders(init?.headers),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  } catch (err) {
    console.error('KV REST request failed', err);
    return null;
  }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const data = await kvFetch<{ result?: T }>(`get/${encodeURIComponent(key)}`);
  return data?.result ?? null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await kvFetch(`set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
}

export async function kvIncr(key: string): Promise<number> {
  const data = await kvFetch<{ result?: number }>(`incr/${encodeURIComponent(key)}`, { method: 'POST' });
  if (typeof data?.result === 'number') return data.result;
  const current = (await kvGet<number>(key)) ?? 0;
  const next = current + 1;
  await kvSet(key, next);
  return next;
}
