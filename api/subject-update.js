import { requireSession } from './_lib/auth.js';
import { handleError, methodNotAllowed, readBody, sendJson } from './_lib/http.js';
import { DEFAULT_SUBJECTS, ensureSeeded, getRedis, KEYS } from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireSession(req, res)) return;
  try {
    const { subjectId, assignmentTitle, dueDate } = await readBody(req);
    if (
      !DEFAULT_SUBJECTS.some((subject) => subject.id === subjectId) ||
      typeof assignmentTitle !== 'string' ||
      typeof dueDate !== 'string' ||
      assignmentTitle.length > 300 ||
      dueDate.length > 100
    ) {
      return sendJson(res, 400, { success: false, error: 'Valid assignment title and due date are required.' });
    }

    const redis = getRedis();
    await ensureSeeded(redis);
    const current = await redis.hget(KEYS.subjects, subjectId);
    if (!current) return sendJson(res, 400, { success: false, error: 'Unknown subject.' });
    const subject = typeof current === 'string' ? JSON.parse(current) : current;
    const updated = { ...subject, assignment_title: assignmentTitle.trim(), due_date: dueDate.trim() };
    const now = new Date().toISOString();
    const transaction = redis.multi();
    transaction.hset(KEYS.subjects, { [subjectId]: JSON.stringify(updated) });
    transaction.set(KEYS.lastUpdated, now);
    await transaction.exec();
    return sendJson(res, 200, { success: true, lastUpdated: now });
  } catch (error) {
    return handleError(res, error);
  }
}
