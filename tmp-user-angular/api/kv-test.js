import { hasKvEnv, kvGet, kvIncr, kvSet } from './kv-client';
const hasEdgeConfigEnv = () => ['EDGE_CONFIG_ID', 'EDGE_CONFIG_TOKEN'].every((key) => !!process.env[key]);
const TEST_KEY = 'kv_test_counter';
let localCounter = 0;
async function edgeConfigGet(key) {
    if (!hasEdgeConfigEnv())
        return null;
    try {
        const { EDGE_CONFIG_ID, EDGE_CONFIG_TOKEN } = process.env;
        const res = await fetch(`https://edge-config.vercel.com/${EDGE_CONFIG_ID}/item/${key}?token=${EDGE_CONFIG_TOKEN}`);
        if (!res.ok)
            return null;
        const data = (await res.json());
        return data.item?.value ?? null;
    }
    catch (err) {
        console.error('Edge Config read failed', err);
        return null;
    }
}
async function edgeConfigSet(key, value) {
    if (!hasEdgeConfigEnv())
        return;
    try {
        const { EDGE_CONFIG_ID, EDGE_CONFIG_TOKEN } = process.env;
        await fetch(`https://edge-config.vercel.com/${EDGE_CONFIG_ID}/items?token=${EDGE_CONFIG_TOKEN}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ items: [{ operation: 'upsert', key, value }] }),
        });
    }
    catch (err) {
        console.error('Edge Config write failed', err);
    }
}
function parseBody(body) {
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        }
        catch {
            return {};
        }
    }
    return typeof body === 'object' && body !== null ? body : {};
}
export default async function handler(req, res) {
    try {
        const useEdgeConfig = hasEdgeConfigEnv();
        const useKv = !useEdgeConfig && hasKvEnv();
        if (req.method === 'GET') {
            if (useEdgeConfig) {
                const counter = (await edgeConfigGet(TEST_KEY)) ?? 0;
                return res.status(200).json({ ok: true, backend: 'edge-config', counter });
            }
            if (useKv) {
                const counter = (await kvGet(TEST_KEY)) ?? 0;
                return res.status(200).json({ ok: true, backend: 'vercel-kv', counter });
            }
            return res.status(200).json({
                ok: true,
                backend: 'local-fallback',
                counter: localCounter,
                message: 'Set EDGE_CONFIG_ID/TOKEN or KV_REST_API_URL/TOKEN to test remote storage.',
            });
        }
        if (req.method === 'POST') {
            const body = parseBody(req.body);
            const requested = body.value;
            if (useEdgeConfig) {
                const current = (await edgeConfigGet(TEST_KEY)) ?? 0;
                const next = typeof requested === 'number' ? requested : current + 1;
                await edgeConfigSet(TEST_KEY, next);
                return res.status(200).json({ ok: true, backend: 'edge-config', counter: next });
            }
            if (useKv) {
                const current = (await kvGet(TEST_KEY)) ?? 0;
                const next = typeof requested === 'number' ? requested : current + 1;
                if (typeof requested === 'number') {
                    await kvSet(TEST_KEY, next);
                }
                else {
                    await kvIncr(TEST_KEY);
                }
                return res.status(200).json({ ok: true, backend: 'vercel-kv', counter: next });
            }
            const next = typeof requested === 'number' ? requested : localCounter + 1;
            localCounter = next;
            return res.status(200).json({
                ok: true,
                backend: 'local-fallback',
                counter: next,
                message: 'Remote KV/Edge Config env vars missing; stored only in-memory for this test call.',
            });
        }
        return res.status(405).json({ error: 'Method not allowed' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
}
