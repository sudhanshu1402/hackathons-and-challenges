import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import peopleRoutes from './routes/people.routes';
import reportRoutes from './routes/report.routes';
import backupRoutes from './routes/backup.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);

app.use(errorHandler);

export default app;
