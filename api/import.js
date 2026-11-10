import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, readBody, sendJson } from './_lib/http.js';
import { getRedis, KEYS, replaceState } from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSession(req, res)) return;
  let redis;
  let lockAcquired = false;
  try {
    redis = getRedis();
    const lock = await redis.set(KEYS.importLock, '1', { nx: true, ex: 30 });
    if (!lock) return sendJson(res, 409, { success: false, error: 'Another import is already in progress. Please retry.' });
    lockAcquired = true;
    if (await redis.exists(KEYS.importCompleted)) {
      return sendJson(res, 409, { success: false, error: 'The browser data has already been imported.' });
    }

    const body = await readBody(req);
    const data = body.data || body;
    const lastUpdated = await replaceState(redis, data, { imported: true });
    return sendJson(res, 200, { success: true, lastUpdated });
  } catch (error) {
    if (/Backup|60 students/.test(error.message)) {
      return sendJson(res, 400, { success: false, error: error.message });
    }
    return handleError(res, error);
  } finally {
    if (lockAcquired) {
      try {
        await redis.del(KEYS.importLock);
      } catch (error) {
        console.error('Unable to release browser import lock; it will expire automatically:', error);
      }
    }
  }
}
