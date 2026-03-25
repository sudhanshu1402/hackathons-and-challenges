const { Router } = require('express');
const pool = require('../config/db');

const router = Router();

// GET /api/subjects - List all subjects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
