-- Database Schema for Student Management System
-- PostgreSQL

-- Create database (run this separately if needed)
-- CREATE DATABASE student_management;

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
    parent_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table (for normalization)
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Marks table (related to students and subjects)
CREATE TABLE IF NOT EXISTS marks (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    marks INTEGER NOT NULL CHECK (marks >= 0 AND marks <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id)
);

-- Index for faster lookups
CREATE INDEX idx_marks_student_id ON marks(student_id);
CREATE INDEX idx_students_email ON students(email);

-- Seed some subjects
INSERT INTO subjects (name) VALUES
    ('Mathematics'),
    ('Science'),
    ('English'),
    ('History'),
    ('Computer Science')
ON CONFLICT (name) DO NOTHING;

-- Seed some sample students
INSERT INTO students (name, email, age) VALUES
    ('John Doe', 'john.doe@example.com', 20),
    ('Jane Smith', 'jane.smith@example.com', 22),
    ('Bob Johnson', 'bob.johnson@example.com', 21),
    ('Alice Williams', 'alice.williams@example.com', 23),
    ('Charlie Brown', 'charlie.brown@example.com', 19)
ON CONFLICT (email) DO NOTHING;

-- Seed some sample marks
INSERT INTO marks (student_id, subject_id, marks) VALUES
    (1, 1, 85), (1, 2, 90), (1, 3, 78),
    (2, 1, 92), (2, 2, 88), (2, 4, 95),
    (3, 1, 70), (3, 3, 82), (3, 5, 91),
    (4, 2, 96), (4, 4, 89), (4, 5, 77),
    (5, 1, 65), (5, 3, 73), (5, 5, 88)
ON CONFLICT (student_id, subject_id) DO NOTHING;
