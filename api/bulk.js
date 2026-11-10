import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, readBody, sendJson } from './_lib/http.js';
import { addActivityLog, DEFAULT_SUBJECTS, ensureSeeded, getRedis, KEYS } from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSession(req, res)) return;
  try {
    const { subjectId, submitted } = await readBody(req);
    if (!DEFAULT_SUBJECTS.some((subject) => subject.id === subjectId) || typeof submitted !== 'boolean') {
      return sendJson(res, 400, { success: false, error: 'A valid subject and submitted status are required.' });
    }

    const redis = getRedis();
    await ensureSeeded(redis);
    const [students, subjectValue] = await Promise.all([
      redis.get(KEYS.students),
      redis.hget(KEYS.subjects, subjectId),
    ]);
    if (!Array.isArray(students) || students.length !== 60) {
      return sendJson(res, 500, { success: false, error: 'Student data is not initialized.' });
    }
    if (!subjectValue) return sendJson(res, 400, { success: false, error: 'Unknown subject.' });
    const subject = typeof subjectValue === 'string' ? JSON.parse(subjectValue) : subjectValue;
    const changes = Object.fromEntries(
      students.map((student) => [`${student.id}_${subjectId}`, submitted ? '1' : '0'])
    );
    const now = new Date().toISOString();
    const transaction = redis.multi();
    transaction.hset(KEYS.submissions, changes);
    transaction.set(KEYS.lastUpdated, now);
    await addActivityLog(
      transaction,
      `${submitted ? 'All marked Submitted' : 'All cleared (Pending)'}: ${subject.name} (60 students)`
    );
    await transaction.exec();
    return sendJson(res, 200, { success: true, lastUpdated: now });
  } catch (error) {
    return handleError(res, error);
  }
}
