import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, sendJson } from './_lib/http.js';
import { getRedis, readState } from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!requireSession(req, res)) return;
  try {
    const data = await readState(getRedis());
    return sendJson(res, 200, { success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
}
