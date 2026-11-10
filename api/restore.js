import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, readBody, sendJson } from './_lib/http.js';
import { getRedis, replaceState } from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSession(req, res)) return;
  try {
    const body = await readBody(req);
    const data = body.data || body;
    const lastUpdated = await replaceState(getRedis(), data);
    return sendJson(res, 200, { success: true, lastUpdated });
  } catch (error) {
    if (/Backup|60 students/.test(error.message)) {
      return sendJson(res, 400, { success: false, error: error.message });
    }
    return handleError(res, error);
  }
}
