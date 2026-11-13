import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';

const apiHandlers = {
  attendance: () => import('./api/attendance.js'),
  'attendance-report': () => import('./api/attendance-report.js'),
  bulk: () => import('./api/bulk.js'),
  'change-password': () => import('./api/change-password.js'),
  import: () => import('./api/import.js'),
  login: () => import('./api/login.js'),
  logout: () => import('./api/logout.js'),
  reset: () => import('./api/reset.js'),
  restore: () => import('./api/restore.js'),
  state: () => import('./api/state.js'),
  'subject-update': () => import('./api/subject-update.js'),
  toggle: () => import('./api/toggle.js'),
};

function localApiPlugin(env) {
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    name: 'local-api-functions',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        const match = url.pathname.match(/^\/api\/([a-z-]+)\/?$/);
        if (!match) return next();

        const loadHandler = apiHandlers[match[1]];
        if (!loadHandler) return next();

        req.query = Object.fromEntries(url.searchParams.entries());
        if (req.method === 'POST') {
          const chunks = [];
          let size = 0;
          try {
            for await (const chunk of req) {
              size += chunk.length;
              if (size > 1024 * 1024) {
                res.statusCode = 413;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                return res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
              }
              chunks.push(chunk);
            }
            const rawBody = Buffer.concat(chunks).toString('utf8');
            req.body = rawBody ? JSON.parse(rawBody) : {};
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.end(JSON.stringify({ success: false, error: 'Invalid JSON body.' }));
          }
        }

        try {
          const { default: handler } = await loadHandler();
          await handler(req, res);
        } catch (error) {
          console.error(`Local API request failed (${url.pathname}):`, error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: false, error: 'The request could not be completed. Please retry.' }));
          }
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), localApiPlugin(loadEnv(mode, process.cwd(), ''))],
  server: {
    port: 5173,
    host: true, // Allows other devices on the same Wi-Fi network to open it (e.g. http://192.168.x.x:5173)
  },
}));
