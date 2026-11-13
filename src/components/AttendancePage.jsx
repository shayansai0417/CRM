import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Printer,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useTracker } from '../context/TrackerContext';
import { exportAttendanceCsv, printAttendanceReport } from '../utils/exportUtils';

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function offsetDate(dateString, days) {
  try {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    return localDateString(date);
  } catch {
    return dateString;
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
  });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (!response.ok || !body.success) {
    throw new Error(body.error || `Request failed (${response.status}).`);
  }
  return body;
}

export default function AttendancePage() {
  const { students } = useTracker();
  const [date, setDate] = useState(() => localDateString());
  const [dateLoaded, setDateLoaded] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [report, setReport] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState({});
  const [search, setSearch] = useState('');
  const [view, setView] = useState('day');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'absent'
  const [belowThresholdOnly, setBelowThresholdOnly] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Syncing');
  const pendingRef = useRef(new Map());
  const selectedDateRef = useRef(date);

  const loadDate = useCallback(async () => {
    try {
      const body = await requestJson(`/api/attendance?date=${encodeURIComponent(date)}`);
      if (selectedDateRef.current !== date) return;
      // body.attendance contains saved records; for new dates backend/fallback returns true for all
      setAttendance(() => ({ ...body.attendance, ...Object.fromEntries(pendingRef.current) }));
      setDateLoaded(true);
      setSyncStatus('Synced');
    } catch (error) {
      if (selectedDateRef.current === date) setSyncStatus(error.message || 'Sync failed');
    }
  }, [date]);

  const loadReport = useCallback(async () => {
    try {
      const body = await requestJson('/api/attendance-report');
      setReport(body.report || []);
      setAttendanceHistory(body.attendanceHistory || {});
    } catch (error) {
      setSyncStatus(error.message || 'Sync failed');
    }
  }, []);

  useEffect(() => {
    selectedDateRef.current = date;
    setDateLoaded(false);
    setSyncStatus('Syncing');
    loadDate();
    const interval = window.setInterval(loadDate, 5000);
    const onFocus = () => loadDate();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadDate]);

  useEffect(() => {
    if (view !== 'report') return undefined;
    loadReport();
    const interval = window.setInterval(loadReport, 5000);
    return () => window.clearInterval(interval);
  }, [loadReport, view]);

  const handleDateChange = (newDate) => {
    if (!newDate || pendingRef.current.size > 0) return;
    selectedDateRef.current = newDate;
    setDateLoaded(false);
    // Clear in-memory attendance so previous date's absentees don't carry over.
    // Unmarked date defaults to Present for everyone (attendance[student.id] !== false is true).
    setAttendance({});
    setDate(newDate);
  };

  // Helper: Unmarked date defaults to Present (attendance[id] !== false is true)
  const isPresent = (studentId) => attendance[studentId] !== false;

  const presentCount = students.reduce(
    (count, student) => count + (isPresent(student.id) ? 1 : 0),
    0
  );
  const absentCount = students.length - presentCount;
  const attendancePercent = students.length ? Math.round((presentCount / students.length) * 100) : 0;

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.name.toLocaleLowerCase().includes(query) ||
        student.roll_number.toLocaleLowerCase().includes(query) ||
        String(student.sno).includes(query);
      if (!matchesSearch) return false;

      const studentPresent = isPresent(student.id);
      if (statusFilter === 'present' && !studentPresent) return false;
      if (statusFilter === 'absent' && studentPresent) return false;
      return true;
    });
  }, [search, students, attendance, statusFilter]);

  const filteredReport = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return report.filter((student) => {
      const matchesSearch =
        !query ||
        student.name.toLocaleLowerCase().includes(query) ||
        student.roll_number.toLocaleLowerCase().includes(query) ||
        String(student.sno).includes(query);
      return matchesSearch && (!belowThresholdOnly || student.attendancePercent < 75);
    });
  }, [belowThresholdOnly, report, search]);

  const changeStudentStatus = async (studentId, nextPresent) => {
    if (!dateLoaded || pendingRef.current.has(studentId)) return;
    const previous = isPresent(studentId);
    pendingRef.current.set(studentId, nextPresent);
    setAttendance((current) => ({ ...current, [studentId]: nextPresent }));
    setSyncStatus('Saving');
    try {
      await requestJson('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, studentId, present: nextPresent }),
      });
      pendingRef.current.delete(studentId);
      if (selectedDateRef.current === date) {
        setSyncStatus('Synced');
        await loadDate();
      }
    } catch (error) {
      pendingRef.current.delete(studentId);
      if (selectedDateRef.current === date) {
        setAttendance((current) => ({ ...current, [studentId]: previous }));
        setSyncStatus(error.message || 'Sync failed');
      }
    }
  };

  const setEveryone = async (allPresent) => {
    if (!dateLoaded || pendingRef.current.size) return;
    if (!allPresent && !window.confirm(`Mark all ${students.length} students absent for ${date}?`)) return;
    const previous = attendance;
    const next = Object.fromEntries(students.map((student) => [student.id, allPresent]));
    for (const [studentId, status] of Object.entries(next)) {
      pendingRef.current.set(studentId, status);
    }
    setAttendance(next);
    setSyncStatus('Saving');
    try {
      await requestJson('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, present: allPresent, all: true }),
      });
      pendingRef.current.clear();
      setSyncStatus('Synced');
      await loadDate();
      if (view === 'report') await loadReport();
    } catch (error) {
      pendingRef.current.clear();
      setAttendance(previous);
      setSyncStatus(error.message || 'Sync failed');
    }
  };

  const exportDateRows = () =>
    students.map((student) => [
      student.sno,
      student.name,
      student.roll_number,
      isPresent(student.id) ? 'Present' : 'Absent',
    ]);
  const dateHeaders = ['S.No', 'Student Name', 'Roll Number', 'Attendance'];

  const downloadDateCsv = () =>
    exportAttendanceCsv(dateHeaders, exportDateRows(), `Attendance_${date}.csv`);

  const printDateReport = () =>
    printAttendanceReport(`Attendance — ${date}`, dateHeaders, exportDateRows());

  const reportHeaders = ['S.No', 'Student Name', 'Roll Number', 'Days Present', 'Days Absent', 'Attendance %'];
  const reportRows = report.map((student) => [
    student.sno,
    student.name,
    student.roll_number,
    student.daysPresent,
    student.daysAbsent,
    `${student.attendancePercent}%`,
  ]);
  const downloadOverallCsv = () =>
    exportAttendanceCsv(reportHeaders, reportRows, 'Attendance_Overall_Report.csv');
  const printOverallReport = () =>
    printAttendanceReport('Attendance — Overall Report', reportHeaders, reportRows);

  return (
    <section className="space-y-3 sm:space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Class Attendance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daily register & cumulative attendance report
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full ${syncStatus === 'Synced' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
          <span
            role="status"
            className={`text-xs font-semibold ${
              syncStatus === 'Synced'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {syncStatus === 'Synced' ? 'Synced' : syncStatus}
          </span>
        </div>
      </div>

      {/* ── Daily vs Overall Report Tabs ── */}
      <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setView('day')}
          className={`min-h-[44px] rounded-xl px-3 py-2 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
            view === 'day'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Daily Register</span>
        </button>
        <button
          type="button"
          onClick={() => setView('report')}
          className={`min-h-[44px] rounded-xl px-3 py-2 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
            view === 'report'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Overall Report</span>
        </button>
      </div>

      {/* ── 3 Compact Metric Counters ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Present counter */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 sm:p-4 text-center sm:text-left transition">
          <div className="text-[11px] sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
            Present
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
            {presentCount}
            <span className="text-xs font-semibold text-emerald-600/70 dark:text-emerald-400/60 ml-0.5">
              /{students.length}
            </span>
          </div>
        </div>

        {/* Absent counter */}
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 p-2.5 sm:p-4 text-center sm:text-left transition">
          <div className="text-[11px] sm:text-sm font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
            Absent
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">
            {absentCount}
          </div>
        </div>

        {/* Attendance % counter */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 sm:p-4 text-center sm:text-left transition">
          <div className="text-[11px] sm:text-sm font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">
            Rate
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5">
            {attendancePercent}%
          </div>
        </div>
      </div>

      {/* ── DAILY VIEW: Sticky Bar + Action Bar ── */}
      {view === 'day' ? (
        <div className="space-y-2">
          {/* Sticky Toolbar Bar (Sticks on scroll on phone & desktop) */}
          <div className="sticky top-[102px] md:top-[80px] z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 shadow-md space-y-2">
            {/* Row 1: Date Picker (with prev/next arrows) + Search Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Date controller */}
              <div className="flex items-center gap-1 min-h-[44px] bg-slate-100 dark:bg-slate-800 rounded-xl px-1.5 py-1 sm:max-w-xs flex-1">
                <button
                  type="button"
                  onClick={() => handleDateChange(offsetDate(date, -1))}
                  disabled={pendingRef.current.size > 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition"
                  title="Previous Day"
                  aria-label="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 flex-1 justify-center min-w-0">
                  <CalendarDays className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => handleDateChange(event.target.value)}
                    disabled={pendingRef.current.size > 0}
                    className="bg-transparent font-bold text-xs sm:text-sm text-slate-900 dark:text-white outline-none cursor-pointer text-center"
                    aria-label="Attendance Date"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDateChange(offsetDate(date, 1))}
                  disabled={pendingRef.current.size > 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition"
                  title="Next Day"
                  aria-label="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative flex-1 min-h-[44px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or roll no…"
                  className="w-full min-h-[44px] pl-9 pr-8 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Search students"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: All Present / All Absent bulk toggle buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEveryone(true)}
                disabled={!dateLoaded || pendingRef.current.size > 0}
                className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                <span>All Present</span>
              </button>
              <button
                type="button"
                onClick={() => setEveryone(false)}
                disabled={!dateLoaded || pendingRef.current.size > 0}
                className="min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
                <span>All Absent</span>
              </button>
            </div>

            {/* Row 3: Filter Tab Row: All, Present, Absent */}
            <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>All</span>
                <span className="text-[10px] px-1 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 font-mono">
                  {students.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('present')}
                className={`min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                  statusFilter === 'present'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Present</span>
                <span className={`text-[10px] px-1 py-0.2 rounded-md font-mono ${statusFilter === 'present' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  {presentCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('absent')}
                className={`min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                  statusFilter === 'absent'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                }`}
              >
                <X className="w-3.5 h-3.5 stroke-[3]" />
                <span>Absent</span>
                <span className={`text-[10px] px-1 py-0.2 rounded-md font-mono ${statusFilter === 'absent' ? 'bg-rose-700 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  {absentCount}
                </span>
              </button>
            </div>
          </div>

          {/* Row below sticky bar: smaller CSV and PDF export buttons */}
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <span className="text-xs text-slate-500 font-semibold">
              Showing {filteredStudents.length} of {students.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadDateCsv}
                disabled={!dateLoaded}
                className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={printDateReport}
                disabled={!dateLoaded}
                className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-500" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* ── PHONE LAYOUT (< md): Tap-Friendly Student Attendance Cards ── */}
          <div className="md:hidden space-y-2">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const present = isPresent(student.id);
                return (
                  <div
                    key={student.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => changeStudentStatus(student.id, !present)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        changeStudentStatus(student.id, !present);
                      }
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none active:scale-[0.99] shadow-sm ${
                      present
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900 shadow-rose-500/10'
                    }`}
                  >
                    {/* Left: Roll No + S.No + Student Name (wrapping fully, never cut off) */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <span className="font-bold text-slate-400">#{student.sno}</span>
                        <span>•</span>
                        <span className="truncate">{student.roll_number}</span>
                      </div>
                      <div className="text-base font-bold text-slate-900 dark:text-white break-words mt-0.5 leading-snug">
                        {student.name}
                      </div>
                    </div>

                    {/* Right: Big Present / Absent Toggle Button (≥ 48px tall) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeStudentStatus(student.id, !present);
                      }}
                      disabled={!dateLoaded || pendingRef.current.has(student.id)}
                      className={`min-h-[48px] min-w-[96px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-sm flex-shrink-0 ${
                        present
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                      }`}
                    >
                      {present ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Present</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 stroke-[3]" />
                          <span>Absent</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center space-y-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-400">No students found matching your filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400"
                >
                  Clear search and filter
                </button>
              </div>
            )}
          </div>

          {/* ── DESKTOP LAYOUT (≥ md): Preserved Table ── */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
              <div className="inline-flex items-center gap-2 font-bold text-sm">
                <Users className="h-4 w-4 text-indigo-500" />
                <span>{filteredStudents.length} students</span>
              </div>
            </div>
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[38%]" />
                <col className="w-[28%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300 font-bold">
                <tr>
                  <th className="px-3 py-3 text-center">S.No</th>
                  <th className="px-3 py-3">Student Name</th>
                  <th className="px-3 py-3">Roll Number</th>
                  <th className="px-3 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => {
                  const present = isPresent(student.id);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-2 py-3 text-center text-slate-500 font-mono text-xs">{student.sno}</td>
                      <td className="break-words px-3 py-3 font-semibold text-sm text-slate-900 dark:text-white leading-tight">
                        {student.name}
                      </td>
                      <td className="break-all px-3 py-3 font-mono text-xs text-slate-500">{student.roll_number}</td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => changeStudentStatus(student.id, !present)}
                          disabled={!dateLoaded || pendingRef.current.has(student.id)}
                          aria-pressed={present}
                          aria-label={`${student.name}: ${present ? 'Present' : 'Absent'}. Tap to change.`}
                          className={`min-h-[44px] w-full rounded-xl px-3 text-xs font-bold text-white sm:max-w-28 transition-transform active:scale-95 shadow-sm ${
                            present ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                          }`}
                        >
                          {present ? 'Present' : 'Absent'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── OVERALL REPORT VIEW ── */
        <div className="space-y-3">
          {/* Report Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1">
              {/* Filter < 75% button */}
              <button
                type="button"
                onClick={() => setBelowThresholdOnly((value) => !value)}
                aria-pressed={belowThresholdOnly}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition ${
                  belowThresholdOnly
                    ? 'border border-rose-300 bg-rose-600 text-white'
                    : 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>{belowThresholdOnly ? 'Showing < 75%' : 'Below 75%'}</span>
              </button>

              {/* Search */}
              <div className="relative flex-1 min-h-[44px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search students…"
                  className="w-full min-h-[44px] pl-9 pr-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            {/* Overall export buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadOverallCsv}
                className="min-h-[44px] flex-1 sm:flex-none px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={printOverallReport}
                className="min-h-[44px] flex-1 sm:flex-none px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-500" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 px-1">
            Based on {Object.keys(attendanceHistory).length} recorded days
          </div>

          {/* ── PHONE LAYOUT (< md): Overall Report Cards ── */}
          <div className="md:hidden space-y-2.5">
            {filteredReport.length > 0 ? (
              filteredReport.map((student) => {
                const isUnderThreshold = student.attendancePercent < 75;
                return (
                  <div
                    key={student.id}
                    className={`p-3.5 rounded-2xl border transition shadow-sm space-y-2 ${
                      isUnderThreshold
                        ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900 text-rose-950 dark:text-rose-200'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Header: S.No + Roll + Name + % */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          <span className="font-bold text-slate-400">#{student.sno}</span>
                          <span>•</span>
                          <span className="truncate">{student.roll_number}</span>
                        </div>
                        <div className="text-base font-bold text-slate-900 dark:text-white break-words mt-0.5 leading-snug">
                          {student.name}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`text-base font-extrabold ${
                            isUnderThreshold
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {student.attendancePercent}%
                        </span>
                        {isUnderThreshold && (
                          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            Below 75%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isUnderThreshold ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, student.attendancePercent))}%` }}
                      />
                    </div>

                    {/* Days present / absent details */}
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                      <span>
                        Present: <strong className="text-slate-900 dark:text-white">{student.daysPresent}</strong> days
                      </span>
                      <span>
                        Absent: <strong className="text-slate-900 dark:text-white">{student.daysAbsent}</strong> days
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center space-y-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-400">No students match this search or filter.</p>
              </div>
            )}
          </div>

          {/* ── DESKTOP LAYOUT (≥ md): Preserved Table ── */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[36%]" />
                <col className="w-[26%]" />
                <col className="w-[30%]" />
              </colgroup>
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300 font-bold">
                <tr>
                  <th className="px-3 py-3 text-center">S.No</th>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Roll</th>
                  <th className="px-3 py-3 text-center">Present / Absent / %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReport.map((student) => (
                  <tr
                    key={student.id}
                    className={
                      student.attendancePercent < 75
                        ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="px-2 py-3 text-center text-xs font-mono">{student.sno}</td>
                    <td className="break-words px-3 py-3 font-semibold text-sm leading-tight">{student.name}</td>
                    <td className="break-all px-3 py-3 font-mono text-xs">{student.roll_number}</td>
                    <td className="px-3 py-3 text-center text-xs leading-tight">
                      <span className="block font-medium">
                        {student.daysPresent} / {student.daysAbsent}
                      </span>
                      <span className={`block font-bold text-sm ${student.attendancePercent < 75 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {student.attendancePercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
