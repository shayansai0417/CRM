# CR Assignment Tracker

A mobile-friendly assignment tracker for AIML Batch 1. Two CRs can sign in to the same Vercel deployment and share live updates through Upstash Redis. Student records contain only S.No, name, and roll number.

## Deploy to Vercel

1. Push this project to a Git provider and import the repository in the Vercel dashboard.
2. Select **Add New → Project**, choose the repository, and keep the detected **Vite** framework settings. The build command is `npm run build`; the output directory is `dist`.
3. Open the Vercel project’s **Storage** tab, choose **Create Database**, select **Upstash for Redis**, create the database, and connect it to this project. The integration should add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. If it does not, copy the REST URL and REST token from the Upstash database’s details into the project environment variables.
4. Open **Settings → Environment Variables** and add these server-only variables for **Production** and **Preview**:
   - `CR_USERNAME` = `CR`
   - `CR_PASSWORD` = `cr123`
   - `AUTH_SECRET` = a new random secret of at least 32 bytes. Generate one privately with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` and paste the output; do not commit it.
   - Confirm `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present for those environments.
5. Redeploy after adding or changing environment variables. If Redis is completely empty, the serverless API seeds the 60 students, five subjects, and 300 pending submission records. Existing Redis keys are never overwritten by auto-seeding.
6. Sign in from each CR’s device using the configured username and password. Both devices use the same cloud state and refresh it every five seconds and when the page regains focus.

The credentials, session secret, and Redis REST credentials are read only by server functions. Do not prefix them with `VITE_` or expose them as client-side variables.
The Change Password action stores only a salted password hash in Redis; after a change, that shared hash takes precedence over the bootstrap `CR_PASSWORD` environment value.

## Import existing browser data

After deployment, sign in and choose **Import browser data** in the header. Confirm the import. It uploads that browser origin’s saved submissions, subject titles/due dates, students, and activity log to Redis. This is a one-time import for the shared database. The button refuses to upload if there is no tracker data saved for that website origin.

Browser local storage is isolated by website origin. If your existing ticks are on the old local site (for example `http://127.0.0.1:5173`) and the deployed Vercel site has a different URL, use the old site’s **Backup** button first, then sign in to Vercel and use **Restore** to upload that JSON backup. You can also use **Restore** to upload the existing `data/tracker_state.json` file directly. Restore strips CRT (Python) and its submission records while retaining the other five subjects.

The regular **Backup** button downloads the current cloud state, including attendance history, as JSON. **Restore** uploads a selected JSON backup to Redis; older backups without attendance remain restorable and do not replace attendance records. Legacy backups containing the retired CRT (Python) subject are accepted, and that subject is ignored.

## Local development

`npm run dev` serves the Vite frontend and invokes the existing API handlers through a development-only middleware. Add the CR credentials, `AUTH_SECRET`, and Upstash Redis REST URL/token from `.env.example` to your ignored `.env` file; without Redis configuration, the API reports a configuration error and shared login/data will not work. `npm run build` builds the frontend. The Vercel deployment serves `/api/*` as serverless functions without a catch-all rewrite. Alternatively, you can use the Vercel CLI locally with `vercel link`, `vercel env pull .env.local`, and `npm run vercel:dev`.

## API

- `POST /api/login`
- `POST /api/logout`
- `GET /api/state`
- `POST /api/toggle`
- `POST /api/subject-update`
- `POST /api/bulk`
- `POST /api/reset`
- `POST /api/change-password`
- `POST /api/import` (one-time browser import)
- `POST /api/restore` (backup restore)
- `GET /api/attendance?date=YYYY-MM-DD` and `POST /api/attendance` (daily attendance and student/bulk updates)
- `GET /api/attendance-report` (overall attendance report and backup history)

All endpoints other than login require a valid signed, HttpOnly session cookie. Login attempts are rate limited using Redis. Single-student submission and attendance changes update one Redis hash field, avoiding whole-state overwrite races between the two CRs.
