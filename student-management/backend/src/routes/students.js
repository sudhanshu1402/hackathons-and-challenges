const { Router } = require('express');
const pool = require('../config/db');

const router = Router();

// POST /api/students - Create student
router.post('/', async (req, res) => {
  try {
    const { name, email, age, parent_id } = req.body;
    const result = await pool.query(
      `INSERT INTO students (name, email, age, parent_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, email, age, parent_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students - List with pagination and search
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const offset = (page - 1) * limit;
    const { search } = req.query;

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE name ILIKE $1 OR email ILIKE $1';
      params.push(`%${search}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM students ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT * FROM students ${whereClause}
       ORDER BY id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/:id - Single student with marks
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const studentResult = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const marksResult = await pool.query(
      `SELECT m.id, m.marks, m.created_at, s.id AS subject_id, s.name AS subject_name
       FROM marks m
       JOIN subjects s ON s.id = m.subject_id
       WHERE m.student_id = $1
       ORDER BY s.name`,
      [id]
    );

    res.json({
      ...studentResult.rows[0],
      marks: marksResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, age, parent_id } = req.body;

    const result = await pool.query(
      `UPDATE students
       SET name = $1, email = $2, age = $3, parent_id = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, email, age, parent_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM students WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
