import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ENV_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');

dotenv.config({ path: ENV_PATH });

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const failedAttempts = new Map();
const sessions = new Map();

function getClientKey(req) {
  return req.socket?.remoteAddress || 'unknown';
}

function matchesPassword(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function login(req, res, username, password) {
  const expectedUsername = process.env.VITE_CR_USERNAME;
  const expectedPassword = process.env.VITE_CR_PASSWORD;
  if (!expectedUsername || !expectedPassword) {
    return sendJson(res, 503, {
      success: false,
      error: 'CR login is not configured. Set VITE_CR_USERNAME and VITE_CR_PASSWORD in .env.',
    });
  }

  const key = getClientKey(req);
  const now = Date.now();
  let attempt = failedAttempts.get(key);
  if (attempt?.lockedUntil > now) {
    const retryAfter = Math.ceil((attempt.lockedUntil - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    return sendJson(res, 429, {
      success: false,
      error: 'Too many failed attempts. Try again in 5 minutes.',
      retryAfter,
    });
  }
  if (attempt?.lockedUntil) {
    failedAttempts.delete(key);
    attempt = undefined;
  }

  if (
    typeof username !== 'string' ||
    username.toLowerCase() !== expectedUsername.toLowerCase() ||
    !matchesPassword(password, expectedPassword)
  ) {
    const count = (attempt?.count || 0) + 1;
    if (count >= MAX_FAILED_ATTEMPTS) {
      failedAttempts.set(key, { count, lockedUntil: now + LOCKOUT_DURATION_MS });
      res.setHeader('Retry-After', '300');
      return sendJson(res, 429, {
        success: false,
        error: 'Too many failed attempts. Try again in 5 minutes.',
        retryAfter: 300,
      });
    }

    failedAttempts.set(key, { count });
    return sendJson(res, 401, { success: false, error: 'Incorrect username or password' });
  }

  failedAttempts.delete(key);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_DURATION_MS);
  return sendJson(res, 200, {
    success: true,
    token,
    user: { username: expectedUsername, role: 'admin' },
  });
}

export function isAuthenticated(req) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer ([\da-f]{64})$/i);
  if (!match) return false;

  const expiresAt = sessions.get(match[1]);
  if (!expiresAt || expiresAt <= Date.now()) {
    sessions.delete(match[1]);
    return false;
  }
  return true;
}

export function sendUnauthorized(res) {
  sendJson(res, 401, { success: false, error: 'CR admin authentication required.' });
}

export function getSession(req, res) {
  if (!isAuthenticated(req)) {
    return sendUnauthorized(res);
  }
  return sendJson(res, 200, {
    success: true,
    user: { username: process.env.VITE_CR_USERNAME, role: 'admin' },
  });
}

export function logout(req) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer ([\da-f]{64})$/i);
  if (match) sessions.delete(match[1]);
}

export function changePassword(req, res, oldPassword, newPassword) {
  if (!isAuthenticated(req)) {
    return sendUnauthorized(res);
  }

  const currentPassword = process.env.VITE_CR_PASSWORD;
  if (!matchesPassword(oldPassword, currentPassword)) {
    return sendJson(res, 400, { success: false, error: 'Current password is incorrect.' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 12 || /[\r\n]/.test(newPassword)) {
    return sendJson(res, 400, {
      success: false,
      error: 'New password must be at least 12 characters.',
    });
  }
  if (matchesPassword(newPassword, currentPassword)) {
    return sendJson(res, 400, {
      success: false,
      error: 'Choose a password different from the current password.',
    });
  }

  try {
    const existing = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    const lines = existing.split(/\r?\n/);
    const setting = `VITE_CR_PASSWORD=${JSON.stringify(newPassword)}`;
    const settingIndex = lines.findIndex((line) => /^\s*VITE_CR_PASSWORD\s*=/.test(line));
    if (settingIndex >= 0) {
      lines[settingIndex] = setting;
    } else {
      lines.push(setting);
    }

    fs.writeFileSync(ENV_PATH, lines.join('\n').replace(/\n*$/, '\n'), 'utf8');
  } catch {
    return sendJson(res, 500, {
      success: false,
      error: 'Unable to save the new password to .env. Check file permissions.',
    });
  }

  process.env.VITE_CR_PASSWORD = newPassword;
  return sendJson(res, 200, { success: true });
}
