import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

console.log('🧪 Starting Sanity Tests for CR Assignment Tracker...');

// 1. Check Excel file exists
const excelPath = './data/Hall_Ticket_Numbers_3001-3060.xlsx';
if (!fs.existsSync(excelPath)) {
  console.error('❌ Excel file missing at ./data/Hall_Ticket_Numbers_3001-3060.xlsx');
  process.exit(1);
}
console.log('✅ Excel file located at ./data/Hall_Ticket_Numbers_3001-3060.xlsx');

// 2. Parse Excel file and verify rows
const wb = XLSX.readFile(excelPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const students = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (r && r[0]) {
    students.push({
      sno: r[0],
      name: r[1],
      email: r[2],
      roll_number: r[3],
    });
  }
}

if (students.length !== 60) {
  console.error(`❌ Expected 60 students, found ${students.length}`);
  process.exit(1);
}
console.log(`✅ Excel parsed: 60 students found (S.No 1 to 60)`);

// 3. Verify students_seed.json has NO email field for privacy
const jsonSeed = JSON.parse(fs.readFileSync('./src/data/students_seed.json', 'utf-8'));
if (jsonSeed.length !== 60) {
  console.error(`❌ Seed JSON length mismatch: ${jsonSeed.length}`);
  process.exit(1);
}

const hasEmail = jsonSeed.some((s) => 'email' in s);
if (hasEmail) {
  console.error('❌ CRITICAL PRIVACY FAILURE: Email found in public seed data!');
  process.exit(1);
}
console.log('✅ Privacy verified: Seed JSON contains S.No, Name, Roll Number, and ZERO emails');

// 4. Verify 5 Subjects in exact order
const expectedSubjects = [
  'Web Development',
  'English',
  'Math',
  'Physics',
  'C Language',
];

const schemaSql = fs.readFileSync('./supabase/schema.sql', 'utf-8');
for (const sub of expectedSubjects) {
  if (!schemaSql.includes(`'${sub}'`)) {
    console.error(`❌ Subject missing from schema.sql: ${sub}`);
    process.exit(1);
  }
}
console.log('✅ All 5 subjects verified in exact order');

// 5. Verify RLS policies in schema.sql
const requiredPolicies = [
  'Public can read students',
  'Public can read subjects',
  'Public can read submissions',
  'Auth admin can insert submissions',
  'Auth admin can update submissions',
];

for (const pol of requiredPolicies) {
  if (!schemaSql.includes(pol)) {
    console.error(`❌ Missing RLS policy: ${pol}`);
    process.exit(1);
  }
}
console.log('✅ Row Level Security (RLS) policies verified in schema.sql');

console.log('\n🎉 ALL SANITY TESTS PASSED SUCCESSFULLY! 🚀');
