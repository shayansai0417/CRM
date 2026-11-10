export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return sendJson(res, 405, { success: false, error: 'Method not allowed.' });
}

export async function readBody(req) {
  const validate = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('JSON body must be an object.');
    }
    return value;
  };
  if (req.body !== undefined) {
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      try {
        return validate(JSON.parse(req.body.toString()));
      } catch {
        throw new Error('Invalid JSON body.');
      }
    }
    return validate(req.body || {});
  }

  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) throw new Error('Request body is too large.');
  }
  if (!raw) return {};
  try {
    return validate(JSON.parse(raw));
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

export function handleError(res, error) {
  if (
    error?.message === 'Invalid JSON body.' ||
    error?.message === 'JSON body must be an object.' ||
    error?.message === 'Request body is too large.'
  ) {
    return sendJson(res, 400, { success: false, error: error.message });
  }
  console.error('Tracker API request failed:', error);
  return sendJson(res, 500, { success: false, error: 'The request could not be completed. Please retry.' });
}
