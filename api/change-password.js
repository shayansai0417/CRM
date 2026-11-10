import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, readBody, sendJson } from './_lib/http.js';
import { changeStoredPassword } from './_lib/auth.js';
import { getRedis } from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSession(req, res)) return;
  try {
    const { oldPassword, newPassword } = await readBody(req);
    const result = await changeStoredPassword(getRedis(), oldPassword, newPassword);
    if (result.status !== 200) return sendJson(res, result.status, { success: false, error: result.error });
    return sendJson(res, 200, { success: true });
  } catch (error) {
    return handleError(res, error);
  }
}
