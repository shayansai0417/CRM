import { checkLogin } from './_lib/auth.js';
import { handleError, methodNotAllowed, readBody } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const body = await readBody(req);
    return await checkLogin(req, res, body.username, body.password);
  } catch (error) {
    return handleError(res, error);
  }
}
