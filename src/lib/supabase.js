import { createClient } from '@supabase/supabase-js';
import initialStudents from '../data/students_seed.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('your-project-id')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const DEFAULT_SUBJECTS = [
  { id: 'sub-1', name: 'Web Development', assignment_title: 'Assignment 1: Portfolio Webpage', due_date: 'Nov 15, 2026', order_index: 1 },
  { id: 'sub-2', name: 'English', assignment_title: 'Assignment 1: Technical Report Writing', due_date: 'Nov 18, 2026', order_index: 2 },
  { id: 'sub-3', name: 'Math', assignment_title: 'Assignment 1: Linear Algebra Problem Set', due_date: 'Nov 20, 2026', order_index: 3 },
  { id: 'sub-4', name: 'Physics', assignment_title: 'Assignment 1: Semiconductor Physics', due_date: 'Nov 22, 2026', order_index: 4 },
  { id: 'sub-5', name: 'C Language', assignment_title: 'Assignment 1: Pointers & Dynamic Memory', due_date: 'Nov 25, 2026', order_index: 5 },
];

export const INITIAL_STUDENTS = initialStudents.map((s, idx) => ({
  id: `stu-${idx + 1}`,
  sno: s.sno,
  name: s.name,
  roll_number: s.roll_number,
}));
