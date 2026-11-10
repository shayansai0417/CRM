import React, { useState, useMemo } from 'react';
import { useTracker } from '../context/TrackerContext';
import {
  Search,
  CheckCircle2,
  XCircle,
  Filter,
  Check,
  X,
  Sparkles,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';

// ─── Mobile Student Card ──────────────────────────────────────────────────────
function StudentCard({ stu, subjects, submissions, isAdmin, toggleSubmission, activeSubjectId }) {
  let submittedCount = 0;
  subjects.forEach((sub) => {
    if (submissions[`${stu.id}_${sub.id}`]) submittedCount++;
  });
  const isAllDone = submittedCount === subjects.length;

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border p-3 space-y-2.5 shadow-sm transition ${
      isAllDone ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-800'
    }`}>
      {/* Row 1: S.No + Name + Roll + Total */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
            {stu.sno}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white text-sm truncate flex items-center gap-1">
              {stu.name}
              {isAllDone && <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            </p>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{stu.roll_number}</p>
          </div>
        </div>
        {/* Total badge */}
        <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-xl min-w-[48px] text-center ${
          isAllDone
            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
            : submittedCount > 0
            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}>
          {submittedCount}/{subjects.length}
        </span>
      </div>

      {/* Row 2: Subject chips */}
      <div className="grid grid-cols-3 gap-1.5">
        {subjects.map((sub, idx) => {
          const isSub = Boolean(submissions[`${stu.id}_${sub.id}`]);
          const isHighlighted = activeSubjectId && sub.id === activeSubjectId;

          if (isAdmin) {
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => toggleSubmission(stu.id, sub.id, isSub, stu.name, sub.name)}
                className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-semibold transition active:scale-95 min-h-[44px] ${
                  isSub
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                    : isHighlighted
                    ? 'bg-rose-50 border-2 border-rose-400 dark:bg-rose-950/40 dark:border-rose-500 text-rose-600 dark:text-rose-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
                title={`${sub.name}: ${isSub ? 'Submitted — tap to mark Pending' : 'Pending — tap to mark Submitted'}`}
              >
                {isSub ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3 h-3" />}
                <span className="truncate">{['Web', 'Eng', 'Math', 'Phys', 'C'][idx]}</span>
              </button>
            );
          }

          return (
            <div
              key={sub.id}
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-semibold ${
                isSub
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80'
              }`}
              title={`${sub.name}: ${isSub ? 'Submitted' : 'Pending'}`}
            >
              {isSub
                ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              }
              <span className="truncate">{['Web', 'Eng', 'Math', 'Phys', 'C'][idx]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main StudentTable ────────────────────────────────────────────────────────
export default function StudentTable({ activeFilter, setActiveFilter }) {
  const { students, subjects, submissions, isAdmin, toggleSubmission } = useTracker();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileActiveSubIdx, setMobileActiveSubIdx] = useState(null); // null = show all chips
  const [showFilters, setShowFilters] = useState(false);

  const totalStudents = students.length;

  // ── Filtering ──
  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (stu) =>
          stu.name.toLowerCase().includes(q) ||
          stu.roll_number.toLowerCase().includes(q) ||
          String(stu.sno).includes(q)
      );
    }

    if (activeFilter === 'all_submitted') {
      result = result.filter((stu) => subjects.every((sub) => submissions[`${stu.id}_${sub.id}`]));
    } else if (activeFilter === 'any_pending') {
      result = result.filter((stu) => subjects.some((sub) => !submissions[`${stu.id}_${sub.id}`]));
    } else if (activeFilter.startsWith('pending_')) {
      const targetSubId = activeFilter.replace('pending_', '');
      result = result.filter((stu) => !submissions[`${stu.id}_${targetSubId}`]);
    }

    return result;
  }, [students, subjects, submissions, searchQuery, activeFilter]);

  const activeSubjectId = mobileActiveSubIdx !== null ? subjects[mobileActiveSubIdx]?.id : null;

  // Short tab labels for mobile
  const shortLabels = ['Web', 'Eng', 'Math', 'Phys', 'C'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="p-3 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-3 no-print">

        {/* Search + count */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or roll number…"
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition min-h-[44px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`sm:hidden flex items-center gap-1 px-3 py-2.5 rounded-2xl text-sm font-semibold min-h-[44px] transition ${
              showFilters || activeFilter !== 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Filter className="w-4 h-4" />
            {activeFilter !== 'all' && <span className="w-2 h-2 bg-amber-400 rounded-full" />}
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0">
            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg whitespace-nowrap">
              {filteredStudents.length} / {totalStudents}
            </span>
          </div>
        </div>

        {/* Filter pills — always visible on desktop, toggleable on mobile */}
        <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap`}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setActiveFilter('all'); setShowFilters(false); }}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition min-h-[44px] ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All ({totalStudents})
            </button>

            <button
              type="button"
              onClick={() => { setActiveFilter('any_pending'); setShowFilters(false); }}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition min-h-[44px] ${
                activeFilter === 'any_pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
              }`}
            >
              Any Pending
            </button>

            <button
              type="button"
              onClick={() => { setActiveFilter('all_submitted'); setShowFilters(false); }}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition min-h-[44px] ${
                activeFilter === 'all_submitted'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
              }`}
            >
              All Done (5/5)
            </button>
          </div>

          {/* Subject filter select */}
          <div className="relative">
            <select
              value={activeFilter.startsWith('pending_') ? activeFilter : ''}
              onChange={(e) => { setActiveFilter(e.target.value || 'all'); setShowFilters(false); }}
              className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-h-[44px]"
            >
              <option value="">Pending for subject…</option>
              {subjects.map((sub, idx) => (
                <option key={sub.id} value={`pending_${sub.id}`}>
                  {idx + 1}. {sub.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {activeFilter !== 'all' && (
            <button
              onClick={() => { setActiveFilter('all'); setShowFilters(false); }}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 font-semibold min-h-[44px] px-2"
            >
              <RotateCcw className="w-4 h-4" /> Clear filter
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile subject tab switcher (admin only) ── */}
      {isAdmin && (
        <div className="sm:hidden flex gap-1.5 px-3 pt-3 overflow-x-auto pb-1 no-print">
          <button
            type="button"
            onClick={() => setMobileActiveSubIdx(null)}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold min-h-[40px] transition ${
              mobileActiveSubIdx === null
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            All Subjects
          </button>
          {subjects.map((sub, idx) => {
            let subCount = 0;
            students.forEach((s) => { if (submissions[`${s.id}_${sub.id}`]) subCount++; });
            const isActive = mobileActiveSubIdx === idx;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setMobileActiveSubIdx(isActive ? null : idx)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold min-h-[40px] transition flex items-center gap-1 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {shortLabels[idx]}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {subCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── MOBILE: Student Cards (< sm) ── */}
      <div className="sm:hidden p-3 space-y-2">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((stu) => (
            <StudentCard
              key={stu.id}
              stu={stu}
              subjects={subjects}
              submissions={submissions}
              isAdmin={isAdmin}
              toggleSubmission={toggleSubmission}
              activeSubjectId={activeSubjectId}
            />
          ))
        ) : (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-400">No students found.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
              className="text-indigo-600 dark:text-indigo-400 text-sm font-bold"
            >
              Clear Search & Filters
            </button>
          </div>
        )}
      </div>

      {/* ── DESKTOP: Traditional Table (≥ sm) ── */}
      <div className="hidden sm:block overflow-x-auto relative max-h-[72vh]">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px] font-bold sticky top-0 z-20 shadow-sm">
            <tr>
              <th scope="col" className="py-3.5 px-3 sm:px-4 sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 w-12 sm:w-16 border-r border-slate-200 dark:border-slate-700 text-center">
                S.No
              </th>
              <th scope="col" className="py-3.5 px-3 sm:px-5 sticky left-12 sm:left-16 z-20 bg-slate-100 dark:bg-slate-800 min-w-[160px] sm:min-w-[200px] border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Student Name
              </th>
              <th scope="col" className="py-3.5 px-3 sm:px-4 min-w-[130px] font-mono border-r border-slate-200 dark:border-slate-700">
                Roll Number
              </th>
              {subjects.map((sub, idx) => (
                <th key={sub.id} scope="col" className="py-3.5 px-2 sm:px-3 text-center min-w-[110px] sm:min-w-[120px] border-r border-slate-200 dark:border-slate-700 font-semibold">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase">Sub {idx + 1}</span>
                    <span className="truncate max-w-[110px]">{sub.name}</span>
                  </div>
                </th>
              ))}
              <th scope="col" className="py-3.5 px-3 sm:px-4 text-center min-w-[90px] bg-slate-100 dark:bg-slate-800">
                Done
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((stu) => {
                let submittedCount = 0;
                subjects.forEach((sub) => { if (submissions[`${stu.id}_${sub.id}`]) submittedCount++; });
                const isAllSubmitted = submittedCount === subjects.length;

                return (
                  <tr key={stu.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-3 px-3 sm:px-4 text-center font-mono font-medium text-slate-500 dark:text-slate-400 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 border-r border-slate-100 dark:border-slate-800">
                      {stu.sno}
                    </td>
                    <td className="py-3 px-3 sm:px-5 font-semibold text-slate-900 dark:text-white sticky left-12 sm:left-16 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-2">
                        <span className="truncate" title={stu.name}>{stu.name}</span>
                        {isAllSubmitted && <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-mono text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                      {stu.roll_number}
                    </td>
                    {subjects.map((sub) => {
                      const isSub = Boolean(submissions[`${stu.id}_${sub.id}`]);
                      return (
                        <td key={sub.id} className="py-2.5 px-2 sm:px-3 text-center border-r border-slate-100 dark:border-slate-800">
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => toggleSubmission(stu.id, sub.id, isSub, stu.name, sub.name)}
                              className={`w-full py-2 px-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 min-h-[36px] ${
                                isSub
                                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                                  : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {isSub ? (
                                <><Check className="w-4 h-4 stroke-[3]" /><span className="font-bold">Done</span></>
                              ) : (
                                <><X className="w-3.5 h-3.5" /><span>Pending</span></>
                              )}
                            </button>
                          ) : (
                            <div className="flex justify-center">
                              {isSub ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />Done
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80">
                                  <XCircle className="w-4 h-4 flex-shrink-0" />Pending
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 sm:px-4 text-center">
                      <span className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-xl text-xs ${
                        isAllSubmitted
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : submittedCount > 0
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {submittedCount}/{subjects.length}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={subjects.length + 3} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <p className="text-base font-semibold">No students found.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
                    className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Clear Search & Filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
        <div>Showing {filteredStudents.length} of {totalStudents} students</div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Green = Submitted</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Red = Pending</span>
        </div>
      </div>
    </div>
  );
}
