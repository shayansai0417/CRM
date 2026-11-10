import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  changePassword,
  getSession,
  isAuthenticated,
  login,
  logout,
  sendUnauthorized,
} from './server/auth.js';
import { withoutCrtSubject } from './shared/subjectMigration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5173;
const DB_PATH = path.resolve(__dirname, 'data/tracker_state.json');
const DIST_PATH = path.resolve(__dirname, 'dist');

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
    if (!fs.existsSync(DB_PATH)) return null;
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (err) {
    return null;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // API Endpoints
  if (url.startsWith('/api/')) {
    if (req.method === 'GET' && url === '/api/session') {
      return getSession(req, res);
    }

    if (req.method === 'GET' && url === '/api/data') {
      const db = readDb();
      if (!db) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Database not initialized' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const { adminPassword, ...publicData } = db;
      return res.end(JSON.stringify({ success: true, data: publicData }));
    }

    if (req.method === 'GET' && url === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('data: {"type":"connected"}\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        let parsed = {};
        try {
          if (body) parsed = JSON.parse(body);
        } catch (e) {}

        if (url === '/api/login') {
          return login(req, res, parsed.username, parsed.password);
        }

        if (url === '/api/logout') {
          logout(req);
          res.writeHead(200, { 'Content-Type': 'application/json' });
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

        const db = readDb();
        if (!db) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false }));
        }

        if (url === '/api/toggle-submission') {
          const { studentId, subjectId, submitted, logDescription } = parsed;
          if (!db.subjects.some((subject) => subject.id === subjectId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: 'Unknown subject.' }));
          }
          db.submissions[`${studentId}_${subjectId}`] = submitted;
          db.lastUpdated = new Date().toISOString();
          if (logDescription) {
            db.activityLogs = [
              { id: `log-${Date.now()}`, description: logDescription, created_at: db.lastUpdated },
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
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true }));
        }

        if (url === '/api/bulk-submissions') {
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
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, lastUpdated: db.lastUpdated }));
          }

          const { subjectId, submitted, logDescription } = parsed;
          if (!db.subjects.some((subject) => subject.id === subjectId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: 'Unknown subject.' }));
          }
          db.students.forEach((s) => (db.submissions[`${s.id}_${subjectId}`] = submitted));
          db.lastUpdated = new Date().toISOString();
          if (logDescription) {
            db.activityLogs = [
              { id: `log-${Date.now()}`, description: logDescription, created_at: db.lastUpdated },
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
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true }));
        }

        if (url === '/api/update-subject') {
          const { subjectId, assignmentTitle, dueDate } = parsed;
          if (!db.subjects.some((subject) => subject.id === subjectId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: 'Unknown subject.' }));
          }
          db.subjects = db.subjects.map((s) =>
            s.id === subjectId ? { ...s, assignment_title: assignmentTitle, due_date: dueDate } : s
          );
          db.lastUpdated = new Date().toISOString();
          writeDb(db);
          broadcastUpdate({ type: 'subjects_update', subjects: db.subjects, lastUpdated: db.lastUpdated });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true }));
        }
      });
      return;
    }
  }

  // Static File Serving
  let filePath = path.join(DIST_PATH, url === '/' ? 'index.html' : url);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_PATH, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading file');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 CR Assignment Tracker is running locally!`);
  console.log(`💻 Local access:   http://localhost:${PORT}`);
  console.log(`📱 Phone access:   http://<your-computer-ip>:${PORT}`);
  console.log(`💾 Data stored at: data/tracker_state.json\n`);
});
