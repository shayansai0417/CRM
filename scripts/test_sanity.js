import assert from 'node:assert/strict';
import fs from 'node:fs';
import seedStudents from '../src/data/students_seed.json' with { type: 'json' };
import {
  DEFAULT_SUBJECTS,
  cleanAttendanceHistory,
  cleanTrackerData,
  ensureSeeded,
  isValidAttendanceDate,
} from '../api/_lib/redis.js';
import { withoutCrtSubject } from '../shared/subjectMigration.js';
import { createSession, readSession } from '../api/_lib/auth.js';

assert.equal(seedStudents.length, 60, 'Expected exactly 60 students.');
assert.ok(seedStudents.every((student) =>
  Object.keys(student).sort().join(',') === 'name,roll_number,sno'
), 'Student data must contain only S.No, name, and roll number.');
assert.equal(DEFAULT_SUBJECTS.length, 5, 'Expected five active subjects.');

const originalState = JSON.parse(fs.readFileSync(new URL('../data/tracker_state.backup.json', import.meta.url), 'utf8'));
const migrated = withoutCrtSubject(originalState.subjects, originalState.submissions);
assert.equal(migrated.subjects.length, 5, 'Old backup migration must remove CRT.');
assert.equal(Object.keys(migrated.submissions).length, 300, 'Old backup migration must retain all five-subject records.');

const safeState = cleanTrackerData({
  students: originalState.students,
  subjects: originalState.subjects,
  submissions: originalState.submissions,
  activityLogs: originalState.activityLogs,
});
assert.equal(safeState.students.length, 60);
assert.equal(safeState.subjects.length, 5);
assert.equal(Object.keys(safeState.submissions).length, 300);
assert.ok(safeState.students.every((student) => !('email' in student)));

assert.equal(isValidAttendanceDate('2026-11-13'), true);
assert.equal(isValidAttendanceDate('2026-02-30'), false);
assert.deepEqual(
  cleanAttendanceHistory({ '2026-11-13': { 'stu-1': false } }, safeState.students),
  { '2026-11-13': { 'stu-1': false } }
);
const existingRedisKeys = {
  exists: async () => 0,
  eval: async (_script, keys) => {
    assert.deepEqual(keys, [
      'cr-tracker:students',
      'cr-tracker:subjects',
      'cr-tracker:submissions',
      'cr-tracker:last-updated',
      'cr-tracker:initialized',
    ]);
    return 0;
  },
};
await ensureSeeded(existingRedisKeys);

process.env.CR_USERNAME = 'CR';
process.env.AUTH_SECRET = 'test-secret-with-at-least-thirty-two-characters';
const responseHeaders = {};
const request = { headers: { 'x-forwarded-proto': 'https' } };
createSession(request, { setHeader: (name, value) => { responseHeaders[name] = value; } }, 'CR');
const cookie = responseHeaders['Set-Cookie'];
assert.match(cookie, /HttpOnly/);
assert.match(cookie, /SameSite=Lax/);
assert.match(cookie, /Secure/);
request.headers.cookie = cookie.split(';')[0];
assert.equal(readSession(request)?.username, 'CR', 'Signed cookie should authenticate.');
request.headers.cookie = `${cookie.split(';')[0]}tampered`;
assert.equal(readSession(request), null, 'Tampered cookie should be rejected.');

console.log('Tracker seed, privacy, five-subject migration, and cloud backup validation passed.');
