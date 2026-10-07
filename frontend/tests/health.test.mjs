import assert from 'node:assert/strict';
import test from 'node:test';

test('Vite sirve la entrada React y reenvia /api al backend', async () => {
  const page = await fetch('http://frontend:5173', { signal: AbortSignal.timeout(10000) });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /\/src\/main.tsx/);
  const api = await fetch('http://frontend:5173/api/health', { signal: AbortSignal.timeout(10000) });
  assert.equal(api.status, 200);
  assert.match(api.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await api.json(), { status: 'ok', service: 'nomix-api' });
});

test('Horizon rechaza el acceso sin autenticacion', async () => {
  const response = await fetch('http://nginx/horizon/api/stats', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 403);
});
