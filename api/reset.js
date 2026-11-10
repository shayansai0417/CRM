import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, sendJson } from './_lib/http.js';
import { addActivityLog, DEFAULT_SUBJECTS, ensureSeeded, getRedis, KEYS } from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSession(req, res)) return;
  try {
    const redis = getRedis();
    await ensureSeeded(redis);
    const students = await redis.get(KEYS.students);
    if (!Array.isArray(students) || students.length !== 60) {
      return sendJson(res, 500, { success: false, error: 'Student data is not initialized.' });
    }
    const subjectIds = DEFAULT_SUBJECTS.map((subject) => subject.id);
    const changes = Object.fromEntries(
      students.flatMap((student) => subjectIds.map((subjectId) => [`${student.id}_${subjectId}`, '0']))
    );
    const now = new Date().toISOString();
    const transaction = redis.multi();
    transaction.del(KEYS.submissions);
    transaction.hset(KEYS.submissions, changes);
    transaction.set(KEYS.lastUpdated, now);
    await addActivityLog(transaction, 'RESET: All submissions cleared to Pending (all 60 students, all 5 subjects)');
    await transaction.exec();
    return sendJson(res, 200, { success: true, lastUpdated: now });
  } catch (error) {
    return handleError(res, error);
  }
}
