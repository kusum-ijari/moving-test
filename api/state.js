import { createClient } from 'redis';

const STATE_KEY = 'moving-tracker-state';

let client = null;
let clientPromise = null;

async function getClient() {
  // Reuse existing client if it's open
  if (client && client.isOpen) return client;
  // Avoid concurrent connect races
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const c = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => Math.min(retries * 100, 2000),
      },
    });
    c.on('error', (err) => console.error('Redis error:', err.message));
    await c.connect();
    client = c;
    return c;
  })();

  try {
    return await clientPromise;
  } finally {
    clientPromise = null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const redis = await getClient();
      const data = await redis.get(STATE_KEY);
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).json(data ? JSON.parse(data) : {});
    } catch (e) {
      console.error('GET /api/state error:', e.message);
      res.status(500).json({ error: 'Failed to load: ' + e.message });
    }
  } else if (req.method === 'POST') {
    try {
      const redis = await getClient();
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      // Validate JSON parses cleanly
      JSON.parse(body);
      const result = await redis.set(STATE_KEY, body);
      if (result !== 'OK') {
        throw new Error('Redis set returned: ' + result);
      }
      // Verify write by reading it back
      const stored = await redis.get(STATE_KEY);
      if (!stored || stored.length !== body.length) {
        throw new Error('Verification failed: stored length mismatch');
      }
      res.status(200).json({ ok: true, size: body.length });
    } catch (e) {
      console.error('POST /api/state error:', e.message);
      res.status(500).json({ error: 'Failed to save: ' + e.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
