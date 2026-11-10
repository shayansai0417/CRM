import React, { useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff, GraduationCap, LockKeyhole } from 'lucide-react';
import { useTracker } from '../context/TrackerContext';

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default function CRLoginPage({ onContinueAsViewer, onLoginSuccess }) {
  const { login } = useTracker();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [lockedSeconds, setLockedSeconds] = useState(0);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lockedSeconds <= 0) {
      if (error === 'Too many failed attempts. Try again in') setError('');
      return undefined;
    }
    const timer = window.setTimeout(() => setLockedSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [lockedSeconds, error]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || lockedSeconds > 0) return;

    setError('');
    setShake(false);
    setLoading(true);
    try {
      await login(username, password);
      setUsername('');
      setPassword('');
      onLoginSuccess();
    } catch (loginError) {
      if (loginError.retryAfter) {
        setLockedSeconds(loginError.retryAfter);
        setError('Too many failed attempts. Try again in');
      } else if (loginError.incorrectCredentials) {
        setError('Incorrect username or password');
        setShake(true);
        window.setTimeout(() => setShake(false), 500);
      } else {
        setError(loginError.message || 'Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 mb-4">
            <GraduationCap className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            CR Assignment Tracker <span className="text-indigo-600 dark:text-indigo-400">|</span> AIML Batch 1
          </h1>
        </div>

        {error && (
          <div
            role="alert"
            className={`mb-5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2 ${shake ? 'login-shake' : ''}`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {error}
              {lockedSeconds > 0 && ` ${formatCountdown(lockedSeconds)}`}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`space-y-4 ${shake ? 'login-shake' : ''}`}>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Username
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              className="mt-1.5 w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-base text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Password
            <div className="relative mt-1.5">
              <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-11 pr-12 text-base text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading || lockedSeconds > 0}
            className="w-full min-h-[48px] rounded-xl bg-indigo-600 px-4 py-3 text-base font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {lockedSeconds > 0 ? `Try again in ${formatCountdown(lockedSeconds)}` : loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <button
          type="button"
          onClick={onContinueAsViewer}
          className="mt-3 w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Continue as Viewer (read-only)
        </button>
      </section>
    </main>
  );
}
