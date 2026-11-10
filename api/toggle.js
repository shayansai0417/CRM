import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, readBody, sendJson } from './_lib/http.js';
import { addActivityLog, DEFAULT_SUBJECTS, ensureSeeded, getRedis, KEYS } from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSession(req, res)) return;
  try {
    const { studentId, subjectId, submitted } = await readBody(req);
    if (
      typeof studentId !== 'string' ||
      !/^stu-\d+$/.test(studentId) ||
      !DEFAULT_SUBJECTS.some((subject) => subject.id === subjectId) ||
      typeof submitted !== 'boolean'
    ) {
      return sendJson(res, 400, { success: false, error: 'A valid student, subject, and submitted status are required.' });
    }

    const redis = getRedis();
    await ensureSeeded(redis);
    const students = await redis.get(KEYS.students);
    if (!Array.isArray(students) || !students.some((student) => student.id === studentId)) {
      return sendJson(res, 400, { success: false, error: 'Unknown student.' });
    }

    const now = new Date().toISOString();
    const student = students.find((item) => item.id === studentId);
    const subjectValue = await redis.hget(KEYS.subjects, subjectId);
    const subject = typeof subjectValue === 'string' ? JSON.parse(subjectValue) : subjectValue;
    const transaction = redis.multi();
    transaction.hset(KEYS.submissions, { [`${studentId}_${subjectId}`]: submitted ? '1' : '0' });
    transaction.set(KEYS.lastUpdated, now);
    await addActivityLog(
      transaction,
      `${submitted ? 'Submitted' : 'Pending'}: ${student.name} (${subject.name})`
    );
    await transaction.exec();
    return sendJson(res, 200, { success: true, lastUpdated: now });
  } catch (error) {
    return handleError(res, error);
  }
}
