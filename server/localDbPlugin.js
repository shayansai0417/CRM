import fs from 'fs';
import path from 'path';
import {
  changePassword,
  getSession,
  isAuthenticated,
  login,
  logout,
  sendUnauthorized,
} from './auth.js';
import { withoutCrtSubject } from '../shared/subjectMigration.js';

const DB_PATH = path.resolve(process.cwd(), 'data/tracker_state.json');

// In-memory set of SSE response streams for realtime local broadcasts
const sseClients = new Set();

function broadcastUpdate(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local JSON db:', err);
    return null;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing local JSON db:', err);
    return false;
  }
}

export function localDbPlugin() {
  return {
    name: 'local-db-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url.split('?')[0];

        if (req.method === 'GET' && url === '/api/session') {
          return getSession(req, res);
        }

        // 1. GET /api/data
        if (req.method === 'GET' && url === '/api/data') {
          const db = readDb();
          if (!db) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: 'Database file not found' }));
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          // Exclude password from public data endpoint
          const { adminPassword, ...publicData } = db;
          return res.end(JSON.stringify({ success: true, data: publicData }));
        }

        // 2. GET /api/events (Server-Sent Events for live local sync)
        if (req.method === 'GET' && url === '/api/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });
          res.write('data: {"type":"connected"}\n\n');

          sseClients.add(res);

          req.on('close', () => {
            sseClients.delete(res);
          });
          return;
        }

        // Helper to parse JSON body
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', () => {
            let parsed = {};
            try {
              if (body) parsed = JSON.parse(body);
            } catch (e) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }

            // 3. POST /api/login
            if (url === '/api/login') {
              return login(req, res, parsed.username, parsed.password);
            }

            if (url === '/api/logout') {
              logout(req);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true }));
            }

            if (url === '/api/change-password') {
              return changePassword(req, res, parsed.oldPassword, parsed.newPassword);
            }

            if (
              ['/api/toggle-submission', '/api/bulk-submissions', '/api/update-subject'].includes(url) &&
              !isAuthenticated(req)
            ) {
              return sendUnauthorized(res);
            }

            // 4. POST /api/toggle-submission
            if (url === '/api/toggle-submission') {
              const db = readDb();
              if (!db) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ success: false }));
              }

              const { studentId, subjectId, submitted, logDescription } = parsed;
              if (!db.subjects.some((subject) => subject.id === subjectId)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: 'Unknown subject.' }));
              }
              const key = `${studentId}_${subjectId}`;
              db.submissions[key] = submitted;
              db.lastUpdated = new Date().toISOString();

              if (logDescription) {
                db.activityLogs = [
                  {
                    id: `log-${Date.now()}`,
                    description: logDescription,
                    created_at: db.lastUpdated,
                  },
                  ...(db.activityLogs || []).slice(0, 49),
                ];
              }

              writeDb(db);
              broadcastUpdate({
                type: 'submission_update',
                studentId,
                subjectId,
                submitted,
                lastUpdated: db.lastUpdated,
                log: db.activityLogs[0],
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, lastUpdated: db.lastUpdated }));
            }

            // 5. POST /api/bulk-submissions
            if (url === '/api/bulk-submissions') {
              const db = readDb();
              if (!db) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ success: false }));
              }

              if (parsed.submissions && Array.isArray(parsed.subjects)) {
                const migrated = withoutCrtSubject(parsed.subjects, parsed.submissions);
                db.subjects = migrated.subjects;
                db.submissions = migrated.submissions;
                db.lastUpdated = new Date().toISOString();
                writeDb(db);
                broadcastUpdate({
                  type: 'subjects_update',
                  subjects: db.subjects,
                  lastUpdated: db.lastUpdated,
                });
                broadcastUpdate({
                  type: 'bulk_update',
                  submissions: db.submissions,
                  lastUpdated: db.lastUpdated,
                });
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, lastUpdated: db.lastUpdated }));
              }

              const { subjectId, submitted, logDescription } = parsed;
              if (!db.subjects.some((subject) => subject.id === subjectId)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: 'Unknown subject.' }));
              }
              db.students.forEach((stu) => {
                db.submissions[`${stu.id}_${subjectId}`] = submitted;
              });
              db.lastUpdated = new Date().toISOString();

              if (logDescription) {
                db.activityLogs = [
                  {
                    id: `log-${Date.now()}`,
                    description: logDescription,
                    created_at: db.lastUpdated,
                  },
                  ...(db.activityLogs || []).slice(0, 49),
                ];
              }

              writeDb(db);
              broadcastUpdate({
                type: 'bulk_update',
                subjectId,
                submitted,
                submissions: db.submissions,
                lastUpdated: db.lastUpdated,
                log: db.activityLogs[0],
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, lastUpdated: db.lastUpdated }));
            }

            // 6. POST /api/update-subject
            if (url === '/api/update-subject') {
              const db = readDb();
              if (!db) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ success: false }));
              }

              const { subjectId, assignmentTitle, dueDate } = parsed;
              if (!db.subjects.some((subject) => subject.id === subjectId)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: 'Unknown subject.' }));
              }
              db.subjects = db.subjects.map((s) =>
                s.id === subjectId
                  ? { ...s, assignment_title: assignmentTitle, due_date: dueDate }
                  : s
              );
              db.lastUpdated = new Date().toISOString();

              writeDb(db);
              broadcastUpdate({
                type: 'subjects_update',
                subjects: db.subjects,
                lastUpdated: db.lastUpdated,
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, subjects: db.subjects }));
            }

            // If no matched POST route, continue
            next();
          });
          return;
        }

        next();
      });
    },
  };
}
