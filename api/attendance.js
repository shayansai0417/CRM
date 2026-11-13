import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, readBody, sendJson } from './_lib/http.js';
import {
  ensureSeeded,
  getRedis,
  isValidAttendanceDate,
  KEYS,
  readAttendanceForDate,
  readState,
} from './_lib/redis.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!requireSession(req, res)) return;

  try {
    const redis = getRedis();
    if (req.method === 'GET') {
      const date = req.query?.date;
      if (!isValidAttendanceDate(date)) {
        return sendJson(res, 400, { success: false, error: 'A valid date is required (YYYY-MM-DD).' });
      }
      const { students } = await readState(redis);
      const attendance = await readAttendanceForDate(redis, date, students.map((student) => student.id));
      return sendJson(res, 200, { success: true, date, attendance });
    }

    const body = await readBody(req);
    if (!isValidAttendanceDate(body.date) || typeof body.present !== 'boolean') {
      return sendJson(res, 400, { success: false, error: 'A valid date and attendance status are required.' });
    }

    await ensureSeeded(redis);
    const studentData = await redis.get(KEYS.students);
    const students = Array.isArray(studentData)
      ? studentData
      : typeof studentData === 'string' ? JSON.parse(studentData) : [];
    const key = `attendance:${body.date}`;
    if (body.all === true) {
      const updates = Object.fromEntries(
        students.map((student) => [student.id, body.present ? '1' : '0'])
      );
      updates._initialized = '1';
      await redis.hset(key, updates);
    } else {
      if (typeof body.studentId !== 'string' ||
        !students.some((student) => student.id === body.studentId)) {
        return sendJson(res, 400, { success: false, error: 'A valid student is required.' });
      }
      await redis.hset(key, { _initialized: '1', [body.studentId]: body.present ? '1' : '0' });
    }

    return sendJson(res, 200, { success: true, date: body.date });
  } catch (error) {
    return handleError(res, error);
  }
}
