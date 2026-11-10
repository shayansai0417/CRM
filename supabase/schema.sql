-- ============================================================
-- CR Assignment Tracker - Supabase SQL Schema & Initial Seed
-- Class: AIML Batch 1 (60 Students, 5 Subjects)
-- Run this in the Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Drop existing tables if re-running script
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- 2. Create tables
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sno INTEGER NOT NULL,
    name TEXT NOT NULL,
    roll_number TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    assignment_title TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    submitted BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT DEFAULT NULL,
    CONSTRAINT unique_student_subject UNIQUE(student_id, subject_id)
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Public can read everything; Only authenticated CR can write
CREATE POLICY "Public can read students" ON students FOR SELECT USING (true);
CREATE POLICY "Public can read subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Public can read submissions" ON submissions FOR SELECT USING (true);
CREATE POLICY "Public can read activity_logs" ON activity_logs FOR SELECT USING (true);

CREATE POLICY "Auth admin can insert students" ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth admin can update students" ON students FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth admin can delete students" ON students FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth admin can insert subjects" ON subjects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth admin can update subjects" ON subjects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth admin can delete subjects" ON subjects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth admin can insert submissions" ON submissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth admin can update submissions" ON submissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth admin can delete submissions" ON submissions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth admin can insert logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Realtime replication setup
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- 6. Seed Subjects
INSERT INTO subjects (name, assignment_title, due_date, order_index) VALUES
    ('Web Development', 'Assignment 1: Portfolio Webpage', 'Nov 15, 2026', 1),
    ('English', 'Assignment 1: Technical Report Writing', 'Nov 18, 2026', 2),
    ('Math', 'Assignment 1: Linear Algebra Problem Set', 'Nov 20, 2026', 3),
    ('Physics', 'Assignment 1: Semiconductor Physics', 'Nov 22, 2026', 4),
    ('C Language', 'Assignment 1: Pointers & Dynamic Memory', 'Nov 25, 2026', 5);

-- 7. Seed 60 Students (Without Emails for Privacy)
INSERT INTO students (sno, name, roll_number) VALUES
    (1, 'Pathaan Mohammed Wahid Ali Khan', '261105B303001'),
    (2, 'Jeel Nileshkumar Patel', '261105B303002'),
    (3, 'Sienna Moguloji', '261105B303003'),
    (4, 'Mohammad Akram', '261105B303004'),
    (5, 'Devaruppala Akshaya Preeti', '261105B303005'),
    (6, 'Meharin K Oommen', '261105B303006'),
    (7, 'Ashna Maira', '261105B303007'),
    (8, 'Sharane Gouda', '261105B303008'),
    (9, 'Uppoju Srinivas', '261105B303009'),
    (10, 'Acuythananda', '261105B303010'),
    (11, 'Nagilla Srividhya', '261105B303011'),
    (12, 'Ganta Vaishnavi', '261105B303012'),
    (13, 'Amulya', '261105B303013'),
    (14, 'Shaik Sana Sulthana', '261105B303014'),
    (15, 'Y.M.Abia Pritika Rani', '261105B303015'),
    (16, 'Chandana. Manche', '261105B303016'),
    (17, 'Dyavanapelly Pragnay', '261105B303017'),
    (18, 'Shrushti', '261105B303018'),
    (19, 'Md Shoaib Alam', '261105B303019'),
    (20, 'Vojjala Sai Shayan', '261105B303020'),
    (21, 'Merugu Jagadish', '261105B303021'),
    (22, 'Chiluveru Vishnu Vardhan', '261105B303022'),
    (23, 'Atiya Begum', '261105B303023'),
    (24, 'Ariz Ahsan', '261105B303024'),
    (25, 'Eelaprolu Uday Sri', '261105B303025'),
    (26, 'Bharath Kumar', '261105B303026'),
    (27, 'Cheripally Sai Tharuni', '261105B303027'),
    (28, 'S Nikeeth Reddy', '261105B303028'),
    (29, 'Sirija Naragam', '261105B303029'),
    (30, 'Mangali Deekshith', '261105B303030'),
    (31, 'Jaggari Deekshitha', '261105B303031'),
    (32, 'Gollapalli Shiva Prasad Goud', '261105B303032'),
    (33, 'Kumba Shiva', '261105B303033'),
    (34, 'Vanga Ramcharan Reddy', '261105B303034'),
    (35, 'E V N R Prabhat', '261105B303035'),
    (36, 'Bonakurthi Shiva', '261105B303036'),
    (37, 'Shaik Sajith', '261105B303037'),
    (38, 'Kunchem Karthik', '261105B303038'),
    (39, 'P.Santhosh Kumar', '261105B303039'),
    (40, 'Likki Eshanth Reddy', '261105B303040'),
    (41, 'Shaik Anas', '261105B303041'),
    (42, 'J.Chandu', '261105B303042'),
    (43, 'Akunuru Dev Sri Prasad', '261105B303043'),
    (44, 'Ravinuthala Naga Maneesha', '261105B303044'),
    (45, 'Shaik Asif', '261105B303045'),
    (46, 'Sai Mohan', '261105B303046'),
    (47, 'T. Vaishnavi', '261105B303047'),
    (48, 'N.Navyasri', '261105B303048'),
    (49, 'E. Pooja', '261105B303049'),
    (50, 'Vaishnavi Anil Pandhare', '261105B303050'),
    (51, 'A.Yashwanth Ram', '261105B303051'),
    (52, 'K.Sai Hrishikesh', '261105B303052'),
    (53, 'D. Shiva Shankar', '261105B303053'),
    (54, 'P.Kishor Kumar', '261105B303054'),
    (55, 'J. Mahesh Babu', '261105B303055'),
    (56, 'Mandla Ranga Shiva Hanuman', '261105B303056'),
    (57, 'Bhanu Ganga Prasad', '261105B303057'),
    (58, 'Maragani Pavan', '261105B303058'),
    (59, 'T.Kasi Hemanth', '261105B303059'),
    (60, 'Shaik Raithurrahman', '261105B303060');

-- 8. Initialize Submissions (all false initially for all 60 students x 5 subjects = 300 rows)
INSERT INTO submissions (student_id, subject_id, submitted)
SELECT s.id, sub.id, FALSE
FROM students s
CROSS JOIN subjects sub;

-- 9. Initial Activity Log
INSERT INTO activity_logs (description) VALUES ('Database initialized with 60 students and 5 subjects for AIML Batch 1');
