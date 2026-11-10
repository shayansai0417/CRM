import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { KEYS, getRedis } from './redis.js';
import { sendJson } from './http.js';

const COOKIE_NAME = 'cr_session';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 5 * 60;
const FAILURE_WINDOW_SECONDS = 15 * 60;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('AUTH_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function signature(payload) {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sessionCookie(req, maxAge, value = '') {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const secure = process.env.VERCEL === '1' || forwardedProto === 'https';
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function createSession(req, res, username) {
  const payload = Buffer.from(JSON.stringify({
    username,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
    nonce: randomBytes(16).toString('base64url'),
  })).toString('base64url');
  const value = `${payload}.${signature(payload)}`;
  res.setHeader('Set-Cookie', sessionCookie(req, SESSION_DURATION_SECONDS, value));
}

export function clearSession(req, res) {
  res.setHeader('Set-Cookie', sessionCookie(req, 0));
}

export function readSession(req) {
  const cookies = String(req.headers.cookie || '').split(';');
  const cookie = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;
  const value = cookie.slice(COOKIE_NAME.length + 1);
  const [payload, providedSignature] = value.split('.');
  if (!payload || !providedSignature) return null;
  try {
    if (!safeEqual(signature(payload), providedSignature)) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      typeof session.exp !== 'number' ||
      session.exp <= Date.now() / 1000 ||
      typeof session.username !== 'string' ||
      !process.env.CR_USERNAME ||
      session.username.toLowerCase() !== process.env.CR_USERNAME.toLowerCase()
    ) return null;
    return session;
  } catch {
    return null;
  }
}

export function requireSession(req, res) {
  const session = readSession(req);
  if (!session) {
    sendJson(res, 401, { success: false, error: 'Your session has expired. Please log in again.' });
    return null;
  }
  return session;
}

function clientKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const address = forwarded || req.socket?.remoteAddress || 'unknown';
  return createHmac('sha256', getSecret()).update(address.slice(0, 128)).digest('hex');
}

function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || !storedHash) return false;
  const [salt, hash] = String(storedHash).split('.');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64).toString('base64url');
  return safeEqual(actual, hash);
}

export async function checkLogin(req, res, username, password) {
  const configuredUsername = process.env.CR_USERNAME;
  const configuredPassword = process.env.CR_PASSWORD;
  if (!configuredUsername || !configuredPassword) {
    return sendJson(res, 503, {
      success: false,
      error: 'CR login is not configured. Set CR_USERNAME and CR_PASSWORD on Vercel.',
    });
  }

  const redis = getRedis();
  const client = clientKey(req);
  const lockKey = `${KEYS.loginLockPrefix}${client}`;
  const retryAfter = Number(await redis.ttl(lockKey));
  if (retryAfter > 0) {
    res.setHeader('Retry-After', String(retryAfter));
    return sendJson(res, 429, {
      success: false,
      error: 'Too many failed attempts. Please wait before trying again.',
      retryAfter,
    });
  }

  const override = await redis.get(KEYS.passwordOverride);
  const passwordMatches = override
    ? verifyPassword(password, override)
    : typeof password === 'string' && safeEqual(password, configuredPassword);
  const usernameMatches =
    typeof username === 'string' &&
    username.toLowerCase() === configuredUsername.toLowerCase();

  if (!usernameMatches || !passwordMatches) {
    const failureKey = `${KEYS.loginFailuresPrefix}${client}`;
    const failures = await redis.incr(failureKey);
    if (failures === 1) await redis.expire(failureKey, FAILURE_WINDOW_SECONDS);
    if (failures >= MAX_FAILED_ATTEMPTS) {
      await redis.set(lockKey, '1', { ex: LOCKOUT_SECONDS });
      await redis.del(failureKey);
      res.setHeader('Retry-After', String(LOCKOUT_SECONDS));
      return sendJson(res, 429, {
        success: false,
        error: 'Too many failed attempts. Please wait before trying again.',
        retryAfter: LOCKOUT_SECONDS,
      });
    }
    return sendJson(res, 401, { success: false, error: 'Incorrect username or password' });
  }

  await redis.del(`${KEYS.loginFailuresPrefix}${client}`, lockKey);
  createSession(req, res, configuredUsername);
  return sendJson(res, 200, { success: true });
}

export async function changeStoredPassword(redis, oldPassword, newPassword) {
  if (typeof newPassword !== 'string' || newPassword.length < 12 || /[\r\n]/.test(newPassword)) {
    return { status: 400, error: 'New password must be at least 12 characters.' };
  }

  const storedHash = await redis.get(KEYS.passwordOverride);
  const currentPassword = process.env.CR_PASSWORD;
  const oldMatches = storedHash
    ? verifyPassword(oldPassword, storedHash)
    : typeof oldPassword === 'string' && typeof currentPassword === 'string' &&
      safeEqual(oldPassword, currentPassword);
  if (!oldMatches) return { status: 400, error: 'Current password is incorrect.' };
  if (oldPassword === newPassword) {
    return { status: 400, error: 'Choose a password different from the current password.' };
  }

  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(newPassword, salt, 64).toString('base64url');
  await redis.set(KEYS.passwordOverride, `${salt}.${hash}`);
  return { status: 200 };
}
