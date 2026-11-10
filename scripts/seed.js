import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY in environment or .env');
  console.error('Please configure your .env file with your Supabase credentials:');
  console.error('VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-or-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const subjectsData = [
  { order_index: 1, name: 'Web Development', assignment_title: 'Assignment 1: Portfolio Webpage', due_date: 'Nov 15, 2026' },
  { order_index: 2, name: 'English', assignment_title: 'Assignment 1: Technical Report Writing', due_date: 'Nov 18, 2026' },
  { order_index: 3, name: 'Math', assignment_title: 'Assignment 1: Linear Algebra Problem Set', due_date: 'Nov 20, 2026' },
  { order_index: 4, name: 'Physics', assignment_title: 'Assignment 1: Semiconductor Physics', due_date: 'Nov 22, 2026' },
  { order_index: 5, name: 'C Language', assignment_title: 'Assignment 1: Pointers & Dynamic Memory', due_date: 'Nov 25, 2026' },
];

async function seed() {
  console.log('🚀 Starting CR Assignment Tracker Database Seed...');
  
  // 1. Locate and parse Excel file
  const excelPath = path.resolve(__dirname, '../data/Hall_Ticket_Numbers_3001-3060.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Excel file not found at: ${excelPath}`);
    process.exit(1);
  }

  console.log(`📖 Reading Excel file: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Rows format: [S.No, Student Name, Email, Hall Ticket / Roll Number, Branch, Batch]
  const students = [];
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[0]) continue;
    
    const sno = parseInt(row[0], 10);
    const name = String(row[1] || '').trim();
    const rollNumber = String(row[3] || '').trim();

    if (!isNaN(sno) && name && rollNumber) {
      students.push({
        sno,
        name,
        roll_number: rollNumber,
      });
    }
  }

  console.log(`✅ Parsed ${students.length} students from Excel (Emails excluded for privacy).`);

  if (students.length !== 60) {
    console.warn(`⚠️ Warning: Expected 60 students, found ${students.length}.`);
  }

  // 2. Upsert Subjects
  console.log('📚 Upserting 6 fixed subjects...');
  const { data: insertedSubjects, error: subjectsError } = await supabase
    .from('subjects')
    .upsert(subjectsData, { onConflict: 'name' })
    .select();

  if (subjectsError) {
    console.error('❌ Failed to insert subjects:', subjectsError);
    process.exit(1);
  }
  console.log(`✅ Inserted/Updated ${insertedSubjects.length} subjects.`);

  // 3. Upsert Students
  console.log('👨‍🎓 Upserting students...');
  const { data: insertedStudents, error: studentsError } = await supabase
    .from('students')
    .upsert(students, { onConflict: 'roll_number' })
    .select();

  if (studentsError) {
    console.error('❌ Failed to insert students:', studentsError);
    process.exit(1);
  }
  console.log(`✅ Inserted/Updated ${insertedStudents.length} students.`);

  // 4. Initialize Submissions (ensure entry exists for each student x subject)
  console.log('📝 Initializing submission grid records...');
  const submissions = [];
  for (const student of insertedStudents) {
    for (const subject of insertedSubjects) {
      submissions.push({
        student_id: student.id,
        subject_id: subject.id,
        submitted: false,
      });
    }
  }

  const { error: submissionsError } = await supabase
    .from('submissions')
    .upsert(submissions, { onConflict: 'student_id,subject_id', ignoreDuplicates: true });

  if (submissionsError) {
    console.warn('⚠️ Note on submissions upsert:', submissionsError.message);
  } else {
    console.log(`✅ Ensured ${submissions.length} submission slots (${insertedStudents.length} students × ${insertedSubjects.length} subjects).`);
  }

  // 5. Add initial activity log
  await supabase.from('activity_logs').insert([
    { description: `Database seeded successfully with ${insertedStudents.length} students and ${insertedSubjects.length} subjects.` }
  ]);

  console.log('🎉 Seed completed successfully!');
}

seed().catch((err) => {
  console.error('❌ Unexpected error during seed:', err);
  process.exit(1);
});
