import React, { useState } from 'react';
import { useTracker } from '../context/TrackerContext';
import {
  CheckCheck,
  XCircle,
  CheckCircle2,
  Calendar,
  Edit3,
  Search,
  Filter,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export default function SubjectFocusMode({
  onOpenConfirm,
  onEditSubject,
}) {
  const { students, subjects, submissions, toggleSubmission } = useTracker();
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || 'sub-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusFilter, setFocusFilter] = useState('all'); // 'all', 'pending', 'submitted'

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  // Calculate stats for current subject
  let submittedCount = 0;
  students.forEach((stu) => {
    if (submissions[`${stu.id}_${activeSubject.id}`]) {
      submittedCount += 1;
    }
  });
  const totalCount = students.length || 60;
  const pendingCount = totalCount - submittedCount;
  const percentage = Math.round((submittedCount / totalCount) * 100);

  // Filter students
  const filteredStudents = students.filter((stu) => {
    const isSub = Boolean(submissions[`${stu.id}_${activeSubject.id}`]);

    if (focusFilter === 'pending' && isSub) return false;
    if (focusFilter === 'submitted' && !isSub) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        stu.name.toLowerCase().includes(q) ||
        stu.roll_number.toLowerCase().includes(q) ||
        String(stu.sno).includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5 no-print">
      
      {/* 1. Subject Switcher Tabs */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <div className="flex space-x-2 min-w-max">
          {subjects.map((sub, idx) => {
            const isActive = sub.id === activeSubject.id;
            let subCount = 0;
            students.forEach((s) => {
              if (submissions[`${s.id}_${sub.id}`]) subCount += 1;
            });
            const subPercent = Math.round((subCount / totalCount) * 100);

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] ${
                    isActive
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {idx + 1}
                </span>
                <span>{sub.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-indigo-700/80 text-white'
                      : subCount === totalCount
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {subCount}/{totalCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Subject Banner & Actions */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-lg space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <span>CR Fast-Ticking Mode</span>
              <span>•</span>
              <span>AIML Batch 1</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
              {activeSubject.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-indigo-200">
              {activeSubject.assignment_title && (
                <span className="px-2.5 py-1 bg-white/10 rounded-lg">
                  {activeSubject.assignment_title}
                </span>
              )}
              {activeSubject.due_date && (
                <span className="px-2.5 py-1 bg-white/10 rounded-lg flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                  Due: {activeSubject.due_date}
                </span>
              )}
              <button
                type="button"
                onClick={() => onEditSubject(activeSubject)}
                className="px-2.5 py-1 bg-indigo-500/30 hover:bg-indigo-500/50 rounded-lg text-indigo-200 flex items-center gap-1 transition"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Title/Date</span>
              </button>
            </div>
          </div>

          {/* Quick Bulk Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                onOpenConfirm({
                  title: `Mark All Submitted for ${activeSubject.name}?`,
                  message: `This will instantly mark all 60 students as SUBMITTED for ${activeSubject.name}.`,
                  confirmText: 'Mark All Submitted',
                  confirmVariant: 'success',
                  action: () => ({ type: 'bulk', subjectId: activeSubject.id, status: true, name: activeSubject.name }),
                })
              }
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center space-x-2 shadow-sm transition"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Submitted</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onOpenConfirm({
                  title: `Clear All Submissions for ${activeSubject.name}?`,
                  message: `This will reset all 60 students back to PENDING for ${activeSubject.name}.`,
                  confirmText: 'Clear All (Pending)',
                  confirmVariant: 'danger',
                  action: () => ({ type: 'bulk', subjectId: activeSubject.id, status: false, name: activeSubject.name }),
                })
              }
              className="px-4 py-2.5 bg-rose-600/80 hover:bg-rose-600 active:bg-rose-700 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center space-x-2 transition"
            >
              <XCircle className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* Progress bar in banner */}
        <div className="space-y-2 pt-2 border-t border-indigo-800/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-indigo-200">
              Progress: <strong className="text-white text-sm">{submittedCount}</strong> / {totalCount} submitted ({pendingCount} pending)
            </span>
            <span className="text-emerald-400 font-extrabold text-sm">{percentage}%</span>
          </div>
          <div className="w-full h-3 bg-indigo-950/80 rounded-full overflow-hidden p-0.5 border border-indigo-700/50">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. Search and View Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or roll no..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFocusFilter('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              focusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFocusFilter('pending')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              focusFilter === 'pending'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFocusFilter('submitted')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              focusFilter === 'submitted'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
            }`}
          >
            Done ({submittedCount})
          </button>
        </div>
      </div>

      {/* 4. Tap-Friendly 60-Student Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredStudents.map((stu) => {
          const isSub = Boolean(submissions[`${stu.id}_${activeSubject.id}`]);

          return (
            <div
              key={stu.id}
              onClick={() =>
                toggleSubmission(
                  stu.id,
                  activeSubject.id,
                  isSub,
                  stu.name,
                  activeSubject.name
                )
              }
              role="button"
              tabIndex={0}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between select-none active:scale-[0.98] ${
                isSub
                  ? 'bg-emerald-50/70 border-emerald-500/80 dark:bg-emerald-950/30 dark:border-emerald-600 shadow-sm shadow-emerald-500/10'
                  : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                    isSub
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {stu.sno}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {stu.name}
                  </h4>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                    {stu.roll_number}
                  </p>
                </div>
              </div>

              {/* Big Tap Toggle Button */}
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform ${
                  isSub
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}
              >
                {isSub ? (
                  <Check className="w-6 h-6 stroke-[3]" />
                ) : (
                  <X className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
