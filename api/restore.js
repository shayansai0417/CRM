import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, readBody, sendJson } from './_lib/http.js';
import {
  cleanAttendanceHistory,
  getRedis,
  replaceState,
  restoreAttendanceHistory,
} from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSession(req, res)) return;
  try {
    const body = await readBody(req);
    const data = body.data || body;
    if (Object.hasOwn(data, 'attendanceHistory')) {
      cleanAttendanceHistory(data.attendanceHistory, data.students);
    }
    const redis = getRedis();
    const lastUpdated = await replaceState(redis, data);
    if (Object.hasOwn(data, 'attendanceHistory')) {
      await restoreAttendanceHistory(redis, data.attendanceHistory, data.students);
    }
    return sendJson(res, 200, { success: true, lastUpdated });
  } catch (error) {
    if (/Backup|60 students|Attendance/.test(error.message)) {
      return sendJson(res, 400, { success: false, error: error.message });
    }
    return handleError(res, error);
  }
}
