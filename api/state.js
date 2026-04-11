import { kv } from '@vercel/kv';

const STATE_KEY = 'moving-tracker-state';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await kv.get(STATE_KEY);
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).json(data || {});
    } catch (e) {
      res.status(200).json({});
    }
  } else if (req.method === 'POST') {
    try {
      const body = req.body;
      await kv.set(STATE_KEY, body);
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
