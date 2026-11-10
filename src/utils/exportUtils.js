export function exportToCSV(students, subjects, submissions, autoFilename = null) {
  const headers = [
    'S.No',
    'Student Name',
    'Roll Number',
    ...subjects.map((s) => s.name),
    `Submitted (x/${subjects.length})`,
    'Completion %',
    'Status',
  ];

  const rows = students.map((stu) => {
    let submittedCount = 0;
    const subjectStatuses = subjects.map((sub) => {
      const isSub = Boolean(submissions[`${stu.id}_${sub.id}`]);
      if (isSub) submittedCount += 1;
      return isSub ? 'Submitted' : 'Pending';
    });

    const percent = Math.round((submittedCount / subjects.length) * 100);
    const overallStatus = submittedCount === subjects.length ? 'Completed' : 'Pending';

    return [
      stu.sno,
      `"${stu.name.replace(/"/g, '""')}"`,
      stu.roll_number,
      ...subjectStatuses,
      `${submittedCount}/${subjects.length}`,
      `${percent}%`,
      overallStatus,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = autoFilename || `AIML_Batch_1_Assignment_Report_${dateStr}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSubjectToCSV(students, subject, submissions) {
  const escapeCsv = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const headers = ['Name', 'Roll No', 'Status'];
  const rows = students.map((student) => [
    escapeCsv(student.name),
    escapeCsv(student.roll_number),
    escapeCsv(submissions[`${student.id}_${subject.id}`] ? 'Submitted' : 'Pending'),
  ]);
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const subjectName = subject.name.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
  link.href = url;
  link.download = `${subjectName}_Submission_List_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printReport() {
  window.print();
}
