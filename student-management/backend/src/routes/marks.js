const { Router } = require('express');
const pool = require('../config/db');

const router = Router();

// POST /api/marks - Add marks
router.post('/', async (req, res) => {
  try {
    const { student_id, subject_id, marks } = req.body;

    if (marks < 0 || marks > 100) {
      return res.status(400).json({ error: 'Marks must be between 0 and 100' });
    }

    const result = await pool.query(
      `INSERT INTO marks (student_id, subject_id, marks, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [student_id, subject_id, marks]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Marks already exist for this student-subject pair' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid student_id or subject_id' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/marks/:id - Update marks
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { marks } = req.body;

    if (marks < 0 || marks > 100) {
      return res.status(400).json({ error: 'Marks must be between 0 and 100' });
    }

    const result = await pool.query(
      'UPDATE marks SET marks = $1 WHERE id = $2 RETURNING *',
      [marks, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Marks record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
