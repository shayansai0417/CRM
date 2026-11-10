import { clearSession, requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    if (!requireSession(req, res)) return;
    clearSession(req, res);
    return sendJson(res, 200, { success: true });
  } catch (error) {
    return handleError(res, error);
  }
}
