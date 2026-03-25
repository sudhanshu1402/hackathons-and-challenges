require('dotenv').config();
const express = require('express');
const cors = require('cors');

const studentsRouter = require('./routes/students');
const subjectsRouter = require('./routes/subjects');
const marksRouter = require('./routes/marks');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/students', studentsRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/marks', marksRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
