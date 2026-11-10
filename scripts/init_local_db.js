import fs from 'fs';
import path from 'path';

const studentsSeed = JSON.parse(fs.readFileSync('./src/data/students_seed.json', 'utf-8'));

const subjects = [
  { id: 'sub-1', name: 'Web Development', assignment_title: 'Assignment 1: Portfolio Webpage', due_date: 'Nov 15, 2026', order_index: 1 },
  { id: 'sub-2', name: 'English', assignment_title: 'Assignment 1: Technical Report Writing', due_date: 'Nov 18, 2026', order_index: 2 },
  { id: 'sub-3', name: 'Math', assignment_title: 'Assignment 1: Linear Algebra Problem Set', due_date: 'Nov 20, 2026', order_index: 3 },
  { id: 'sub-4', name: 'Physics', assignment_title: 'Assignment 1: Semiconductor Physics', due_date: 'Nov 22, 2026', order_index: 4 },
  { id: 'sub-5', name: 'C Language', assignment_title: 'Assignment 1: Pointers & Dynamic Memory', due_date: 'Nov 25, 2026', order_index: 5 },
];

const students = studentsSeed.map((s, idx) => ({
  id: `stu-${idx + 1}`,
  sno: s.sno,
  name: s.name,
  roll_number: s.roll_number,
}));

const submissions = {};
students.forEach((stu) => {
  subjects.forEach((sub) => {
    submissions[`${stu.id}_${sub.id}`] = false;
  });
});

const initialState = {
  version: 1,
  className: 'AIML Batch 1',
  lastUpdated: new Date().toISOString(),
  adminPassword: 'cr123',
  students,
  subjects,
  submissions,
  activityLogs: [
    {
      id: 'log-init',
      description: 'Local database created with 60 students and 5 subjects',
      created_at: new Date().toISOString(),
    },
  ],
};

fs.writeFileSync('./data/tracker_state.json', JSON.stringify(initialState, null, 2), 'utf-8');
console.log('✅ Created data/tracker_state.json successfully with 60 students.');
