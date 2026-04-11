import { createClient } from 'redis';

const STATE_KEY = 'moving-tracker-state';

let client = null;

async function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => console.error('Redis error:', err));
    await client.connect();
  }
  return client;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const redis = await getClient();
      const data = await redis.get(STATE_KEY);
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).json(data ? JSON.parse(data) : {});
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === 'POST') {
    try {
      const redis = await getClient();
      await redis.set(STATE_KEY, JSON.stringify(req.body));
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
