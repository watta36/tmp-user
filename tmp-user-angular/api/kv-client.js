const baseUrl = () => process.env.KV_REST_API_URL?.replace(/\/$/, '');
const writeToken = () => process.env.KV_REST_API_TOKEN;
const readToken = () => process.env.KV_REST_API_READ_ONLY_TOKEN || writeToken();
const headers = (token) => ({
    authorization: token ? `Bearer ${token}` : '',
    'content-type': 'application/json',
});
export function hasKvEnv() {
    return !!(baseUrl() && readToken());
}
async function kvRequest(path, options = {}) {
    const url = baseUrl();
    const token = writeToken() ?? readToken();
    if (!url || !token)
        throw new Error('KV environment variables missing');
    const res = await fetch(`${url}/${path}`, {
        ...options,
        headers: { ...headers(token), ...(options.headers || {}) },
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`KV request failed (${res.status}): ${body}`);
    }
    return res;
}
export async function kvGet(key) {
    const res = await kvRequest(`get/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: headers(readToken()),
    });
    const data = (await res.json());
    return data.result ?? null;
}
export async function kvSet(key, value) {
    await kvRequest(`set/${encodeURIComponent(key)}`, {
        method: 'POST',
        body: JSON.stringify({ value }),
    });
}
export async function kvIncr(key) {
    const res = await kvRequest(`incr/${encodeURIComponent(key)}`, { method: 'POST' });
    const data = (await res.json());
    return data.result ?? 0;
}
