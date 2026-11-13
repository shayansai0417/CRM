import React from 'react';
import { useTracker } from '../context/TrackerContext';
import { Calendar, Edit3, ArrowRight } from 'lucide-react';

export default function SummaryStats({ onEditSubject, onOpenSubject }) {
  const { students, subjects, submissions, isAdmin } = useTracker();
  const totalStudents = students.length || 60;

  return (
    <div className="space-y-2.5 sm:space-y-3 no-print">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Subject Submission Summary
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
            Completion metrics across all {totalStudents} students
          </p>
        </div>
      </div>

      {/* Mobile: 2-col grid. Tablet: 3-col. Desktop: 6-col. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {subjects.map((sub, index) => {
          let submittedCount = 0;
          students.forEach((stu) => {
            if (submissions[`${stu.id}_${sub.id}`]) submittedCount += 1;
          });

          const pendingCount = totalStudents - submittedCount;
          const percentage = Math.round((submittedCount / totalStudents) * 100);

          return (
            <article
              key={sub.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenSubject(sub.id)}
              onKeyDown={(event) => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onOpenSubject(sub.id);
                }
              }}
              className="relative cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 transition shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex flex-col justify-between"
            >
              <div>
                {/* Subject header */}
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Sub {index + 1}
                    </span>
                    <h3
                      className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-words leading-tight"
                      title={sub.name}
                    >
                      {sub.name}
                    </h3>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditSubject(sub);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex-shrink-0 min-h-[44px] min-w-[36px] flex items-center justify-center"
                      title="Edit Assignment Title & Due Date"
                      aria-label={`Edit ${sub.name}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Assignment title & due date (hidden on smallest screens) */}
                {(sub.assignment_title || sub.due_date) && (
                  <div className="mt-1.5 py-1.5 px-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[10px] space-y-0.5 hidden sm:block">
                    {sub.assignment_title && (
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate" title={sub.assignment_title}>
                        {sub.assignment_title}
                      </p>
                    )}
                    {sub.due_date && (
                      <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[10px]">
                        <Calendar className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        <span className="truncate">{sub.due_date}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Progress numbers */}
                <div className="mt-2.5 flex items-baseline justify-between text-xs">
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                    {submittedCount}
                    <span className="text-[11px] font-medium text-slate-400"> /{totalStudents}</span>
                  </span>
                  <span
                    className={`font-bold text-xs ${percentage === 100 ? 'text-emerald-600' : 'text-indigo-600 dark:text-indigo-400'}`}
                  >
                    {percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 sm:h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      percentage === 100 ? 'bg-emerald-500' : percentage > 50 ? 'bg-indigo-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Pending count */}
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Pending:</span>
                  <span
                    className={`font-bold ${pendingCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}
                  >
                    {pendingCount}
                  </span>
                </div>
              </div>

              {/* Quick filter button */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenSubject(sub.id);
                }}
                className="mt-2 sm:mt-3 w-full py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                <span>Pending ({pendingCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
