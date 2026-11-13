import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, sendJson } from './_lib/http.js';
import { getRedis, readAttendanceHistory, readState } from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!requireSession(req, res)) return;

  try {
    const redis = getRedis();
    const { students } = await readState(redis);
    const attendanceHistory = await readAttendanceHistory(redis, students);
    const dates = Object.keys(attendanceHistory);
    const report = students.map((student) => {
      let daysPresent = 0;
      for (const date of dates) {
        if (attendanceHistory[date][student.id]) daysPresent += 1;
      }
      const daysAbsent = dates.length - daysPresent;
      const attendancePercent = dates.length
        ? Math.round((daysPresent / dates.length) * 100)
        : 0;
      return { ...student, daysPresent, daysAbsent, attendancePercent };
    });

    return sendJson(res, 200, {
      success: true,
      dates,
      attendanceHistory,
      report,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
