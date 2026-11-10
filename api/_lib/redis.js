import { Redis } from '@upstash/redis';
import { createRequire } from 'node:module';
import { DEFAULT_SUBJECTS } from '../../shared/defaultData.js';

const require = createRequire(import.meta.url);
const studentSeed = require('../../src/data/students_seed.json');

export { DEFAULT_SUBJECTS };

export const KEYS = {
  initialized: 'cr-tracker:initialized',
  importCompleted: 'cr-tracker:local-import-completed',
  importLock: 'cr-tracker:local-import-lock',
  students: 'cr-tracker:students',
  subjects: 'cr-tracker:subjects',
  submissions: 'cr-tracker:submissions',
  activityLogs: 'cr-tracker:activity-logs',
  lastUpdated: 'cr-tracker:last-updated',
  passwordOverride: 'cr-tracker:password-override',
  loginFailuresPrefix: 'cr-tracker:login-failures:',
  loginLockPrefix: 'cr-tracker:login-lock:',
};

let redisClient;

export function getRedis() {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (!url || !token) {
      const error = new Error(
        'Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_URL and KV_REST_API_TOKEN.'
      );
      error.statusCode = 503;
      throw error;
    }
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

function decode(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function createSeedState() {
  const students = studentSeed.map((student, index) => ({
    id: `stu-${index + 1}`,
    sno: student.sno,
    name: student.name,
    roll_number: student.roll_number,
  }));
  const submissions = Object.fromEntries(
    students.flatMap((student) =>
      DEFAULT_SUBJECTS.map((subject) => [`${student.id}_${subject.id}`, '0'])
    )
  );
  return { students, submissions };
}

export async function ensureSeeded(redis = getRedis()) {
  if (await redis.exists(KEYS.initialized)) return;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const lock = await redis.set('cr-tracker:seed-lock', '1', { nx: true, ex: 30 });
    if (lock) {
      try {
        if (!(await redis.exists(KEYS.initialized))) {
          const { students, submissions } = createSeedState();
          const now = new Date().toISOString();
          const transaction = redis.multi();
          transaction.set(KEYS.students, JSON.stringify(students));
          transaction.del(KEYS.subjects, KEYS.submissions, KEYS.activityLogs);
          transaction.hset(
            KEYS.subjects,
            Object.fromEntries(DEFAULT_SUBJECTS.map((subject) => [subject.id, JSON.stringify(subject)]))
          );
          transaction.hset(KEYS.submissions, submissions);
          transaction.set(KEYS.lastUpdated, now);
          transaction.set(KEYS.initialized, '1');
          await transaction.exec();
        }
        return;
      } finally {
        await redis.del('cr-tracker:seed-lock');
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    if (await redis.exists(KEYS.initialized)) return;
  }

  throw new Error('Tracker data initialization is still in progress. Please retry.');
}

export async function readState(redis = getRedis()) {
  await ensureSeeded(redis);
  const [studentsValue, subjectValues, submissionValues, logValues, lastUpdated, imported] =
    await Promise.all([
      redis.get(KEYS.students),
      redis.hgetall(KEYS.subjects),
      redis.hgetall(KEYS.submissions),
      redis.lrange(KEYS.activityLogs, 0, 49),
      redis.get(KEYS.lastUpdated),
      redis.exists(KEYS.importCompleted),
    ]);

  const subjects = Object.entries(subjectValues || {})
    .map(([, value]) => decode(value, null))
    .filter(Boolean)
    .sort((a, b) => a.order_index - b.order_index);
  const submissions = Object.fromEntries(
    Object.entries(submissionValues || {}).map(([key, value]) => [
      key,
      value === true || value === 1 || value === '1' || value === 'true',
    ])
  );

  return {
    students: decode(studentsValue, []),
    subjects,
    submissions,
    activityLogs: (logValues || []).map((value) => decode(value, null)).filter(Boolean),
    lastUpdated: decode(lastUpdated, new Date().toISOString()),
    importedLocalData: Boolean(imported),
  };
}

export function makeActivityLog(description) {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description,
    created_at: new Date().toISOString(),
  };
}

export async function addActivityLog(transaction, description) {
  if (!description) return null;
  const log = makeActivityLog(description);
  transaction.lpush(KEYS.activityLogs, JSON.stringify(log));
  transaction.ltrim(KEYS.activityLogs, 0, 49);
  return log;
}

export function cleanTrackerData(input) {
  if (!input || typeof input !== 'object') throw new Error('Backup data is invalid.');
  const studentRows = Array.isArray(input.students) ? input.students : [];
  const students = studentRows
    .filter((student) => student && typeof student === 'object')
    .map((student, index) => ({
      id: String(student.id || `stu-${index + 1}`),
      sno: Number(student.sno),
      name: String(student.name || '').trim(),
      roll_number: String(student.roll_number || '').trim(),
    }));

  if (
    students.length !== 60 ||
    students.some((student) =>
      !/^stu-\d+$/.test(student.id) ||
      !student.name ||
      !student.roll_number ||
      !Number.isInteger(student.sno)
    ) ||
    new Set(students.map((student) => student.id)).size !== 60
  ) {
    throw new Error('Backup must contain 60 students with names and roll numbers.');
  }

  const providedSubjects = Array.isArray(input.subjects) ? input.subjects : [];
  const subjects = DEFAULT_SUBJECTS.map((defaultSubject) => {
    const savedSubject = providedSubjects.find((subject) => subject?.id === defaultSubject.id);
    if (!savedSubject) return defaultSubject;
    return {
      ...defaultSubject,
      assignment_title: typeof savedSubject.assignment_title === 'string'
        ? savedSubject.assignment_title
        : defaultSubject.assignment_title,
      due_date: typeof savedSubject.due_date === 'string'
        ? savedSubject.due_date
        : defaultSubject.due_date,
    };
  });

  const suppliedSubmissions = input.submissions && typeof input.submissions === 'object'
    ? input.submissions
    : {};
  const submissions = {};
  for (const student of students) {
    for (const subject of subjects) {
      const key = `${student.id}_${subject.id}`;
      const value = suppliedSubmissions[key];
      submissions[key] = value === true || value === 1 || value === '1' || value === 'true';
    }
  }

  const activityLogs = Array.isArray(input.activityLogs)
    ? input.activityLogs.slice(0, 50).filter(
      (log) => log && typeof log.description === 'string' && typeof log.created_at === 'string'
    )
    : [];
  return { students, subjects, submissions, activityLogs };
}

export async function replaceState(redis, data, { imported = false } = {}) {
  const safeData = cleanTrackerData(data);
  const now = new Date().toISOString();
  const transaction = redis.multi();
  transaction.set(KEYS.students, JSON.stringify(safeData.students));
  transaction.del(KEYS.subjects, KEYS.submissions, KEYS.activityLogs);
  transaction.hset(
    KEYS.subjects,
    Object.fromEntries(safeData.subjects.map((subject) => [subject.id, JSON.stringify(subject)]))
  );
  const encodedSubmissions = Object.fromEntries(
    Object.entries(safeData.submissions).map(([key, value]) => [key, value ? '1' : '0'])
  );
  transaction.hset(KEYS.submissions, encodedSubmissions);
  if (safeData.activityLogs.length) {
    transaction.lpush(KEYS.activityLogs, ...safeData.activityLogs.slice().reverse().map(JSON.stringify));
  }
  transaction.set(KEYS.lastUpdated, now);
  transaction.set(KEYS.initialized, '1');
  if (imported) transaction.set(KEYS.importCompleted, '1');
  await transaction.exec();
  return now;
}
