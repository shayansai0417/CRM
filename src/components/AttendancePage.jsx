import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCheck,
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
  const [belowThresholdOnly, setBelowThresholdOnly] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Syncing');
  const pendingRef = useRef(new Map());
  const selectedDateRef = useRef(date);

  const loadDate = useCallback(async () => {
    try {
      const body = await requestJson(`/api/attendance?date=${encodeURIComponent(date)}`);
      if (selectedDateRef.current !== date) return;
      setAttendance((current) => ({ ...body.attendance, ...Object.fromEntries(pendingRef.current) }));
      setDateLoaded(true);
      setSyncStatus('Synced');
    } catch (error) {
      if (selectedDateRef.current === date) setSyncStatus(error.message || 'Sync failed');
    }
  }, [date]);

  const loadReport = useCallback(async () => {
    try {
      const body = await requestJson('/api/attendance-report');
      setReport(body.report);
      setAttendanceHistory(body.attendanceHistory);
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

  const presentCount = students.reduce(
    (count, student) => count + (attendance[student.id] !== false ? 1 : 0),
    0
  );
  const absentCount = students.length - presentCount;
  const attendancePercent = students.length ? Math.round((presentCount / students.length) * 100) : 0;
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return students.filter((student) =>
      !query ||
      student.name.toLocaleLowerCase().includes(query) ||
      student.roll_number.toLocaleLowerCase().includes(query)
    );
  }, [search, students]);
  const filteredReport = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return report.filter((student) => {
      const matchesSearch = !query ||
        student.name.toLocaleLowerCase().includes(query) ||
        student.roll_number.toLocaleLowerCase().includes(query);
      return matchesSearch && (!belowThresholdOnly || student.attendancePercent < 75);
    });
  }, [belowThresholdOnly, report, search]);

  const changeStudentStatus = async (studentId, present) => {
    if (!dateLoaded || pendingRef.current.has(studentId)) return;
    const previous = attendance[studentId] !== false;
    pendingRef.current.set(studentId, present);
    setAttendance((current) => ({ ...current, [studentId]: present }));
    setSyncStatus('Saving');
    try {
      await requestJson('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, studentId, present }),
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

  const setEveryone = async (present) => {
    if (!dateLoaded || pendingRef.current.size) return;
    if (!present && !window.confirm(`Mark all ${students.length} students absent for ${date}?`)) return;
    const previous = attendance;
    const next = Object.fromEntries(students.map((student) => [student.id, present]));
    for (const [studentId, status] of Object.entries(next)) {
      pendingRef.current.set(studentId, status);
    }
    setAttendance(next);
    setSyncStatus('Saving');
    try {
      await requestJson('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, present, all: true }),
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

  const exportDateRows = () => students.map((student) => [
    student.sno,
    student.name,
    student.roll_number,
    attendance[student.id] !== false ? 'Present' : 'Absent',
  ]);
  const dateHeaders = ['S.No', 'Student Name', 'Roll Number', 'Attendance'];

  const downloadDateCsv = () => exportAttendanceCsv(
    dateHeaders,
    exportDateRows(),
    `Attendance_${date}.csv`
  );

  const printDateReport = () => printAttendanceReport(
    `Attendance — ${date}`,
    dateHeaders,
    exportDateRows()
  );

  const reportHeaders = ['S.No', 'Student Name', 'Roll Number', 'Days Present', 'Days Absent', 'Attendance %'];
  const reportRows = report.map((student) => [
    student.sno,
    student.name,
    student.roll_number,
    student.daysPresent,
    student.daysAbsent,
    `${student.attendancePercent}%`,
  ]);
  const downloadOverallCsv = () => exportAttendanceCsv(
    reportHeaders,
    reportRows,
    'Attendance_Overall_Report.csv'
  );
  const printOverallReport = () => printAttendanceReport(
    'Attendance — Overall Report',
    reportHeaders,
    reportRows
  );

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Attendance</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Shared attendance record for all students</p>
        </div>
        <span
          role="status"
          className={`text-sm font-semibold ${syncStatus === 'Synced' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}
          title={syncStatus}
        >
          {syncStatus === 'Synced' ? 'Synced' : syncStatus}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView('day')}
          className={`flex-1 rounded-xl px-4 py-3 font-semibold min-h-[48px] ${view === 'day' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}`}
        >
          Daily Attendance
        </button>
        <button
          type="button"
          onClick={() => setView('report')}
          className={`flex-1 rounded-xl px-4 py-3 font-semibold min-h-[48px] ${view === 'report' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}`}
        >
          Overall Report
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">Present</div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{presentCount} / {students.length}</div>
        </div>
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-rose-800 dark:text-rose-300">Absent</div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-700 dark:text-rose-300">{absentCount}</div>
        </div>
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-indigo-800 dark:text-indigo-300">Attendance</div>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">{attendancePercent}%</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {view === 'day' ? (
          <label className="flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3">
            <CalendarDays className="h-5 w-5 shrink-0 text-indigo-500" />
            <span className="font-medium">Date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                selectedDateRef.current = event.target.value;
                setDateLoaded(false);
                setDate(event.target.value);
              }}
              disabled={pendingRef.current.size > 0}
              className="min-w-0 flex-1 bg-transparent py-2 text-right text-slate-900 dark:text-white"
              aria-label="Attendance date"
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setBelowThresholdOnly((value) => !value)}
            aria-pressed={belowThresholdOnly}
            className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 font-semibold ${belowThresholdOnly ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
          >
            <Filter className="h-4 w-4" />
            {belowThresholdOnly ? 'Showing Below 75%' : 'Below 75%'}
          </button>
        )}
        <label className="flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 sm:max-w-sm sm:flex-1">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or roll number"
            className="min-w-0 flex-1 bg-transparent py-2 outline-none"
            aria-label="Search by name or roll number"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="min-h-[40px] p-2" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      {view === 'day' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEveryone(true)}
            disabled={!dateLoaded || pendingRef.current.size > 0}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700 sm:flex-none"
          >
            <CheckCheck className="h-5 w-5" /> All Present
          </button>
          <button
            type="button"
            onClick={() => setEveryone(false)}
            disabled={!dateLoaded || pendingRef.current.size > 0}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 font-bold text-white hover:bg-rose-700 sm:flex-none"
          >
            <X className="h-5 w-5" /> All Absent
          </button>
          <div className="flex flex-1 gap-2 sm:justify-end">
            <button type="button" onClick={downloadDateCsv} disabled={!dateLoaded} className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:flex-none">
              <Download className="mr-1 inline h-4 w-4" /> CSV
            </button>
            <button type="button" onClick={printDateReport} disabled={!dateLoaded} className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:flex-none">
              <Printer className="mr-1 inline h-4 w-4" /> PDF
            </button>
          </div>
        </div>
      )}

      {view === 'report' && (
        <div className="flex gap-2">
          <button type="button" onClick={downloadOverallCsv} className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Download className="mr-1 inline h-4 w-4" /> Export overall CSV
          </button>
          <button type="button" onClick={printOverallReport} className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Printer className="mr-1 inline h-4 w-4" /> Save overall PDF
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-3 py-3 sm:px-4">
          <div className="inline-flex items-center gap-2 font-bold">
            <Users className="h-5 w-5 text-indigo-500" />
            {view === 'day' ? `${filteredStudents.length} students` : `${filteredReport.length} students`}
          </div>
          {view === 'report' && (
            <span className="text-xs text-slate-500 dark:text-slate-400">Based on {Object.keys(attendanceHistory).length} recorded days</span>
          )}
        </div>
        {view === 'day' ? (
          <table className="w-full table-fixed text-left">
            <colgroup><col className="w-[9%]" /><col className="w-[37%]" /><col className="w-[26%]" /><col className="w-[28%]" /></colgroup>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <tr><th className="px-2 py-3 text-center">S.No</th><th className="px-2 py-3">Student Name</th><th className="px-2 py-3">Roll Number</th><th className="px-1 py-3 text-center">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map((student) => {
                const present = attendance[student.id] !== false;
                return (
                  <tr key={student.id}>
                    <td className="px-1 py-2 text-center text-slate-500">{student.sno}</td>
                    <td className="break-words px-2 py-2 font-medium leading-tight">{student.name}</td>
                    <td className="break-all px-2 py-2 font-mono text-xs text-slate-500">{student.roll_number}</td>
                    <td className="px-1 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => changeStudentStatus(student.id, !present)}
                        disabled={!dateLoaded || pendingRef.current.has(student.id)}
                        aria-pressed={present}
                        aria-label={`${student.name}: ${present ? 'Present' : 'Absent'}. Tap to change.`}
                        className={`min-h-[44px] w-full rounded-xl px-1 text-xs font-bold text-white sm:max-w-28 sm:px-3 ${present ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                      >
                        {present ? 'Present' : 'Absent'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full table-fixed text-left">
            <colgroup><col className="w-[9%]" /><col className="w-[33%]" /><col className="w-[23%]" /><col className="w-[35%]" /></colgroup>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <tr><th className="px-2 py-3 text-center">S.No</th><th className="px-2 py-3">Student</th><th className="px-2 py-3">Roll</th><th className="px-2 py-3 text-center">Present / Absent / %</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReport.map((student) => (
                <tr key={student.id} className={student.attendancePercent < 75 ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300' : ''}>
                  <td className="px-1 py-2 text-center">{student.sno}</td>
                  <td className="break-words px-2 py-2 font-medium leading-tight">{student.name}</td>
                  <td className="break-all px-2 py-2 font-mono text-xs">{student.roll_number}</td>
                  <td className="px-1 py-2 text-center text-xs leading-tight">
                    <span className="block">{student.daysPresent} / {student.daysAbsent}</span>
                    <span className="block font-bold">{student.attendancePercent}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
