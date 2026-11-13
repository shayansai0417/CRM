import React, { useRef, useState } from 'react';
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
  MoreHorizontal,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors no-print pt-safe">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

        {/* ── MOBILE HEADER (< 768px): Compact Row 1 + Segmented Control Row 2 ── */}
        <div className="md:hidden py-2 space-y-2">
          {/* Row 1: App Title + Synced Indicator + ⋯ Menu button */}
          <div className="flex items-center justify-between gap-2 min-h-[44px]">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200 dark:border-indigo-800">
                    AIML B1
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Cloud className="w-2.5 h-2.5" />
                    Shared
                  </span>
                </div>
                <h1 className="text-sm font-extrabold text-slate-900 dark:text-white truncate tracking-tight leading-tight">
                  CR Assignment Tracker
                </h1>
              </div>
            </div>

            {/* Right: Synced status + Menu trigger */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800"
                title={syncError || `Last synced ${lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'waiting'}`}
              >
                <span className={`w-2 h-2 rounded-full ${syncError ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className={`text-[11px] font-semibold ${syncError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {syncError ? 'Error' : 'Synced'}
                </span>
                {syncError && (
                  <button
                    type="button"
                    onClick={retrySync}
                    className="p-1 text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    aria-label="Retry sync"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* ⋯ Menu button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition shadow-sm"
                aria-label="Open menu"
                title="More actions"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Row 2: Sticky Segmented Control for Navigation Tabs */}
          {isAdmin && (
            <nav className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setPageMode('dashboard');
                  setViewMode('grid');
                }}
                className={`min-h-[44px] py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                  pageMode !== 'attendance' && viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4 flex-shrink-0" />
                <span>All</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPageMode('dashboard');
                  setViewMode('focus');
                }}
                className={`min-h-[44px] py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                  pageMode !== 'attendance' && viewMode === 'focus'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <CheckSquare className="w-4 h-4 flex-shrink-0" />
                <span>Focus</span>
              </button>
              <button
                type="button"
                onClick={() => setPageMode('attendance')}
                className={`min-h-[44px] py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                  pageMode === 'attendance'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                <span>Attendance</span>
              </button>
            </nav>
          )}
        </div>

        {/* ── DESKTOP HEADER (≥ 768px): Preserved Layout ── */}
        <div className="hidden md:flex flex-wrap items-center justify-between min-h-14 sm:h-20 gap-2 py-2 sm:py-0">

          {/* Left: Branding */}
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

          {/* Right: Controls */}
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
                    pageMode !== 'attendance' && viewMode === 'grid'
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
                    pageMode !== 'attendance' && viewMode === 'focus'
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

            {/* Reset All (CR only, red) */}
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

      {/* Hidden file input for restore */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      {/* ── MOBILE BOTTOM SHEET MENU (⋯ Menu) ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet Container */}
          <div className="relative z-10 bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-4 pb-safe space-y-3 max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Actions Menu</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">CR Assignment Tracker</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Actions */}
            <div className="space-y-1.5">
              {/* CSV Export */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleExportCSV();
                }}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">Export CSV Report</div>
                  <div className="text-xs text-slate-500 font-normal truncate">Download full assignment spreadsheet</div>
                </div>
              </button>

              {/* PDF Print */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  printReport();
                }}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">Print / Save PDF</div>
                  <div className="text-xs text-slate-500 font-normal truncate">Formatted print report</div>
                </div>
              </button>

              {/* Activity Log / History */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openLogModal();
                }}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">Activity Log (History)</div>
                  <div className="text-xs text-slate-500 font-normal truncate">View recent changes & timestamps</div>
                </div>
              </button>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={() => {
                  setDarkMode(!darkMode);
                }}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-sm font-bold truncate">{darkMode ? 'Light Theme' : 'Dark Theme'}</div>
                    <div className="text-xs text-slate-500 font-normal truncate">Toggle appearance mode</div>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex-shrink-0">
                  {darkMode ? 'Dark' : 'Light'}
                </span>
              </button>
            </div>

            {/* CR Admin Section */}
            {isAdmin && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="px-1 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Admin & Data Controls
                </div>

                {/* Backup JSON */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    exportLocalBackup();
                  }}
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">Backup (Download JSON)</div>
                    <div className="text-xs text-slate-500 font-normal truncate">Export complete database backup file</div>
                  </div>
                </button>

                {/* Restore JSON */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">Restore Backup</div>
                    <div className="text-xs text-slate-500 font-normal truncate">Upload & apply JSON backup snapshot</div>
                  </div>
                </button>

                {/* Import Browser Data if available */}
                {!importedLocalData && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleImportLocalData();
                    }}
                    className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-3 transition"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">Import Browser Data</div>
                      <div className="text-xs opacity-80 font-normal truncate">Upload device local data to cloud</div>
                    </div>
                  </button>
                )}

                {/* Change Password */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openChangePasswordModal();
                  }}
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">Change Password</div>
                    <div className="text-xs text-slate-500 font-normal truncate">Update CR admin security password</div>
                  </div>
                </button>

                {/* Reset All in RED (with existing confirmation) */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onResetAll();
                  }}
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center gap-3 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">Reset All Submissions</div>
                    <div className="text-xs opacity-80 font-normal truncate">Sets all to Pending (auto-backup first)</div>
                  </div>
                </button>

                {/* Logout */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-semibold text-rose-600 dark:text-rose-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-3 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">Log Out</div>
                    <div className="text-xs text-slate-500 font-normal truncate">Sign out of CR admin mode</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
