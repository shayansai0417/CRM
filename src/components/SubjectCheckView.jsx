import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Search,
  X,
} from 'lucide-react';
import { useTracker } from '../context/TrackerContext';
import { exportSubjectToCSV } from '../utils/exportUtils';
import SubjectPrintView from './SubjectPrintView';

const FILTERS = ['all', 'pending', 'submitted'];

export default function SubjectCheckView({
  subject,
  subjectIndex,
  subjectCount,
  onBack,
  onNavigateSubject,
  onConfirmBulkUpdate,
}) {
  const { students, subjects, submissions, isAdmin, toggleSubmission } = useTracker();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setSearchQuery('');
    setFilter('all');
  }, [subject.id]);

  const submittedCount = students.reduce(
    (count, student) => count + (submissions[`${student.id}_${subject.id}`] ? 1 : 0),
    0
  );
  const pendingCount = students.length - submittedCount;

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return students.filter((student) => {
      const submitted = Boolean(submissions[`${student.id}_${subject.id}`]);
      if (filter === 'pending' && submitted) return false;
      if (filter === 'submitted' && !submitted) return false;
      if (!query) return true;
      return student.name.toLowerCase().includes(query) || student.roll_number.toLowerCase().includes(query);
    });
  }, [students, submissions, subject.id, searchQuery, filter]);

  const toggleStudentSubmission = (student) => {
    if (!isAdmin) return;
    const submitted = Boolean(submissions[`${student.id}_${subject.id}`]);
    toggleSubmission(student.id, subject.id, submitted, student.name, subject.name);
  };

  const handleBulkUpdate = (submitted) => {
    if (!isAdmin) return;
    onConfirmBulkUpdate({
      subjectId: subject.id,
      submitted,
      subjectName: subject.name,
    });
  };

  return (
    <>
      <SubjectPrintView subject={subject} />
      <section className="no-print space-y-4 sm:space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubject(subjects[subjectIndex - 1].id)}
              disabled={subjectIndex <= 0}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40"
              aria-label="Previous subject"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {subjectIndex + 1} / {subjectCount}
            </span>
            <button
              type="button"
              onClick={() => onNavigateSubject(subjects[subjectIndex + 1].id)}
              disabled={subjectIndex >= subjectCount - 1}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40"
              aria-label="Next subject"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Subject {subjectIndex + 1}
              </p>
              <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {subject.name}
              </h1>
              {subject.assignment_title && (
                <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{subject.assignment_title}</p>
              )}
              {subject.due_date && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Due: {subject.due_date}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => handleBulkUpdate(true)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4" />
                    Mark all submitted
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkUpdate(false)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50"
                  >
                    <X className="w-4 h-4" />
                    Clear all
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => exportSubjectToCSV(students, subject, submissions)}
                aria-label="Download this subject's list as CSV"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                aria-label="Download this subject's list as PDF"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </header>

        <div className="sticky top-32 lg:top-20 z-20 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:px-4">
            <p aria-live="polite" className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              Submitted {submittedCount} / {students.length}
              <span className="font-semibold text-slate-500 dark:text-slate-400"> • Pending {pendingCount}</span>
            </p>
            <div className="flex w-full sm:w-auto items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              {FILTERS.map((filterKey) => {
                const count = filterKey === 'all' ? students.length : filterKey === 'pending' ? pendingCount : submittedCount;
                const label = filterKey === 'all' ? 'All' : filterKey === 'pending' ? 'Pending' : 'Submitted';
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setFilter(filterKey)}
                    aria-pressed={filter === filterKey}
                    className={`flex-1 sm:flex-none min-h-[40px] rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition ${
                      filter === filterKey
                        ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-3 pb-3 sm:px-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name or roll number"
                aria-label="Search name or roll number"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            No students match this search and filter.
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full table-fixed text-left">
                <thead className="sticky top-[232px] z-10 bg-slate-100 dark:bg-slate-800 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <tr>
                    <th scope="col" className="w-20 px-4 py-3">S.No</th>
                    <th scope="col" className="px-4 py-3">Student Name</th>
                    <th scope="col" className="w-52 px-4 py-3">Roll Number</th>
                    <th scope="col" className="w-40 px-4 py-3 text-center">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.map((student) => {
                    const submitted = Boolean(submissions[`${student.id}_${subject.id}`]);
                    return (
                      <tr
                        key={student.id}
                        onClick={() => toggleStudentSubmission(student)}
                        onKeyDown={(event) => {
                          if (isAdmin && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            toggleStudentSubmission(student);
                          }
                        }}
                        role={isAdmin ? 'checkbox' : undefined}
                        tabIndex={isAdmin ? 0 : undefined}
                        aria-checked={isAdmin ? submitted : undefined}
                        aria-label={isAdmin ? `${student.name} submitted` : undefined}
                        className={`h-14 ${isAdmin ? 'cursor-pointer hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 focus:outline-none focus:bg-indigo-50 dark:focus:bg-indigo-950/40' : ''}`}
                      >
                        <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{student.sno}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{student.name}</td>
                        <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-slate-300">{student.roll_number}</td>
                        <td className="px-4 py-3 text-center">
                          {isAdmin ? (
                            <span
                              aria-hidden="true"
                              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg border-2 ${
                                submitted
                                  ? 'border-emerald-600 bg-emerald-500 text-white'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}
                            >
                              {submitted && <Check className="h-6 w-6 stroke-[3]" />}
                            </span>
                          ) : (
                            <span className={`font-semibold ${submitted ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                              {submitted ? '✅ Submitted' : '❌ Pending'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {filteredStudents.map((student) => {
                const submitted = Boolean(submissions[`${student.id}_${subject.id}`]);
                return (
                  <button
                    key={student.id}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => toggleStudentSubmission(student)}
                    className={`flex w-full min-h-[64px] items-center justify-between gap-3 rounded-2xl border p-3.5 text-left shadow-sm transition ${
                      submitted
                        ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    } ${isAdmin ? 'active:scale-[0.99]' : 'cursor-default'}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-600 dark:text-slate-300">
                        {student.sno}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-bold text-base text-slate-900 dark:text-white leading-tight">{student.name}</span>
                        <span className="mt-0.5 block truncate font-mono text-xs text-slate-500 dark:text-slate-400">{student.roll_number}</span>
                      </span>
                    </span>
                    {isAdmin ? (
                      <span
                        aria-label={submitted ? 'Submitted' : 'Pending'}
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2 ${
                          submitted
                            ? 'border-emerald-600 bg-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {submitted && <Check className="h-7 w-7 stroke-[3]" />}
                      </span>
                    ) : (
                      <span className={`flex-shrink-0 text-xs font-bold ${submitted ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {submitted ? '✅ Submitted' : '❌ Pending'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="flex justify-between gap-3 pb-2">
          <button
            type="button"
            onClick={() => onNavigateSubject(subjects[subjectIndex - 1].id)}
            disabled={subjectIndex <= 0}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> Previous subject
          </button>
          <button
            type="button"
            onClick={() => onNavigateSubject(subjects[subjectIndex + 1].id)}
            disabled={subjectIndex >= subjectCount - 1}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40"
          >
            Next subject <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </>
  );
}
