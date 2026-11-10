import React from 'react';
import { useTracker } from '../context/TrackerContext';

export default function SubjectPrintView({ subject }) {
  const { students, submissions } = useTracker();
  const printedAt = new Date().toLocaleString();

  return (
    <div className="print-only p-4 bg-white text-black font-sans text-xs">
      <header className="text-center pb-4 mb-4 border-b-2 border-black">
        <h1 className="text-xl font-bold">{subject.name}</h1>
        {subject.assignment_title && <p className="mt-1">{subject.assignment_title}</p>}
        {subject.due_date && <p className="mt-1">Due: {subject.due_date}</p>}
        <p className="mt-1 text-gray-600">Generated on {printedAt}</p>
      </header>

      <table className="w-full border-collapse border border-gray-400">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-2 text-left">Name</th>
            <th className="border border-gray-400 p-2 text-left">Roll No</th>
            <th className="border border-gray-400 p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const submitted = Boolean(submissions[`${student.id}_${subject.id}`]);
            return (
              <tr key={student.id}>
                <td className="border border-gray-400 p-2">{student.name}</td>
                <td className="border border-gray-400 p-2">{student.roll_number}</td>
                <td className="border border-gray-400 p-2">{submitted ? 'Submitted' : 'Pending'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
