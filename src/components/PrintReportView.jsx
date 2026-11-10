import React from 'react';
import { useTracker } from '../context/TrackerContext';

export default function PrintReportView() {
  const { students, subjects, submissions, lastUpdated } = useTracker();

  const printDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="print-only p-4 bg-white text-black font-sans text-xs">
      <div className="text-center pb-4 mb-4 border-b-2 border-black">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          AIML Batch 1 — Class Assignment Report
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          Total Students: 60 • Generated on: {printDate}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4 text-[10px]">
        {subjects.map((sub, idx) => {
          let count = 0;
          students.forEach((stu) => {
            if (submissions[`${stu.id}_${sub.id}`]) count++;
          });
          return (
            <div key={sub.id} className="p-2 border border-gray-400 rounded">
              <p className="font-bold">{idx + 1}. {sub.name}</p>
              <p className="text-gray-600 mt-0.5">{sub.assignment_title || 'Assignment 1'}</p>
              <p className="font-semibold mt-1">Submitted: {count}/60</p>
            </div>
          );
        })}
      </div>

      <table className="w-full border-collapse border border-gray-400 text-[10px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-1 text-center w-8">S.No</th>
            <th className="border border-gray-400 p-1 text-left">Student Name</th>
            <th className="border border-gray-400 p-1 text-left font-mono">Roll Number</th>
            {subjects.map((sub) => (
              <th key={sub.id} className="border border-gray-400 p-1 text-center">
                {sub.name}
              </th>
            ))}
            <th className="border border-gray-400 p-1 text-center w-16">Total</th>
          </tr>
        </thead>
        <tbody>
          {students.map((stu) => {
            let submitted = 0;
            subjects.forEach((sub) => {
              if (submissions[`${stu.id}_${sub.id}`]) submitted++;
            });

            return (
              <tr key={stu.id} className="border-b border-gray-300">
                <td className="border border-gray-400 p-1 text-center font-mono">{stu.sno}</td>
                <td className="border border-gray-400 p-1 font-semibold">{stu.name}</td>
                <td className="border border-gray-400 p-1 font-mono">{stu.roll_number}</td>
                {subjects.map((sub) => {
                  const isSub = Boolean(submissions[`${stu.id}_${sub.id}`]);
                  return (
                    <td
                      key={sub.id}
                      className={`border border-gray-400 p-1 text-center font-bold ${
                        isSub ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {isSub ? '✓ Submitted' : '✗ Pending'}
                    </td>
                  );
                })}
                <td className="border border-gray-400 p-1 text-center font-bold">
                  {submitted} / {subjects.length}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 pt-2 border-t border-gray-400 flex justify-between text-[10px] text-gray-500">
        <span>CR Assignment Tracker • AIML Batch 1</span>
        <span>Verified by Class Representative (CR)</span>
      </div>
    </div>
  );
}
