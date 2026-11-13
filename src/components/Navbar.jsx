import React, { useRef } from 'react';
import { useTracker } from '../context/TrackerContext';
import { exportToCSV, printReport } from '../utils/exportUtils';
import {
  GraduationCap,
  Moon,
  Sun,
  Download,
  Printer,
  History,
  KeyRound,
  LogOut,
  RefreshCw,
  LayoutGrid,
  CheckSquare,
  ShieldCheck,
  FileJson,
  Upload,
  Trash2,
  Cloud,
  RotateCw,
  CalendarDays,
} from 'lucide-react';

export default function Navbar({
  darkMode,
  setDarkMode,
  openLogModal,
  openChangePasswordModal,
  viewMode,
  setViewMode,
  pageMode,
  setPageMode,
  onResetAll,
}) {
  const {
    students,
    subjects,
    submissions,
    isAdmin,
    logout,
    lastUpdated,
    lastSyncedAt,
    syncError,
    refreshData,
    retrySync,
    loading,
    exportLocalBackup,
    importLocalBackup,
    importedLocalData,
    importCurrentLocalData,
  } = useTracker();

  const fileInputRef = useRef(null);

  const handleExportCSV = () => exportToCSV(students, subjects, submissions);
  const handleImportLocalData = () => {
    if (window.confirm('Import this browser’s saved tracker data into the shared cloud database? This will replace the current shared tracker data.')) {
      importCurrentLocalData();
    }
  };
  const handleLogout = () => logout();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        importLocalBackup(json);
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatLastUpdated = (date) => {
    if (!date) return 'Just now';
    try {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between min-h-14 sm:h-20 gap-2 py-2 sm:py-0">

          {/* ── Left: Branding ── */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-800">
                  AIML B1
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Cloud className="w-3 h-3" />
                  Shared
                </span>
              </div>
              <h1 className="text-sm sm:text-xl font-extrabold text-slate-900 dark:text-white truncate tracking-tight leading-tight">
                CR Assignment Tracker
              </h1>
            </div>
          </div>

          {/* ── Right: Controls ── */}
          <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-1 sm:gap-2">

            {/* View mode switcher — admin only */}
            {isAdmin && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl items-center space-x-1">
                <button
                  type="button"
                  onClick={() => {
                    setPageMode('dashboard');
                    setViewMode('grid');
                  }}
                  title="All Subjects Grid"
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>All</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPageMode('dashboard');
                    setViewMode('focus');
                  }}
                  title="Focus Mode — one subject at a time"
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                    viewMode === 'focus'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Focus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPageMode('attendance')}
                  title="Attendance"
                  aria-current={pageMode === 'attendance' ? 'page' : undefined}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                    pageMode === 'attendance'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Attendance</span>
                </button>
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={`Refresh · Last saved ${formatLastUpdated(lastUpdated)}`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <span
              role={syncError ? 'alert' : 'status'}
              className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium ${
                syncError ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
              }`}
              title={syncError || `Last synced ${lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'waiting'}`}
            >
              {syncError ? 'Sync failed' : `Synced${lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}
            </span>
            {syncError && (
              <button
                type="button"
                onClick={retrySync}
                className="inline-flex items-center gap-1 px-2 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg min-h-[44px]"
                aria-label="Retry saving"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}

            {/* ── Reset All (CR only, red) ── */}
            {isAdmin && (
              <button
                onClick={onResetAll}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition min-h-[44px]"
                title="Reset ALL submissions to Pending (auto-backup first)"
                aria-label="Reset All"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="sm:hidden">Reset</span>
                <span className="hidden sm:inline">Reset All</span>
              </button>
            )}

            {/* Backup and restore */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-1">
                {!importedLocalData && (
                  <button
                    onClick={handleImportLocalData}
                    className="p-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 rounded-xl transition flex items-center gap-1 min-h-[44px]"
                    title="Import saved data from this browser to shared cloud storage"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Import browser data</span>
                  </button>
                )}
                <button
                  onClick={exportLocalBackup}
                  className="p-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1 min-h-[44px]"
                  title="Download JSON backup"
                >
                  <FileJson className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Backup</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1 min-h-[44px]"
                  title="Restore from JSON backup"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Restore</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
              </div>
            )}

            {/* Export CSV / PDF */}
            {isAdmin && pageMode !== 'attendance' && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="p-2 sm:px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 min-h-[44px]"
                  title="Download CSV Report"
                >
                  <Download className="w-4 h-4 text-indigo-500" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={printReport}
                  className="p-2 sm:px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 min-h-[44px]"
                  title="Print / Save PDF"
                >
                  <Printer className="w-4 h-4 text-indigo-500" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </>
            )}

            {/* Activity log */}
            <button
              onClick={openLogModal}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Activity Log"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden xl:flex flex-col text-right">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> CR
                </span>
              </div>
              <button
                onClick={openChangePasswordModal}
                className="p-2 sm:px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition min-h-[44px]"
                title="Change password"
              >
                <KeyRound className="w-4 h-4" />
                <span className="hidden sm:inline">Change Password</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 sm:px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition min-h-[44px]"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
