import { Router } from 'express';
import * as backupService from '../services/backup.service';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

router.post('/backup', authenticate, requireRole('ADMIN'), async (req, res, next) => {
	try {
		await backupService.backupDatabase();
		res.json({ message: 'Backup successful' });
	} catch (err) {
		next(err);
	}
});

router.post('/restore', authenticate, requireRole('ADMIN'), async (req, res, next) => {
	try {
		const { fileId } = req.body;
		await backupService.restoreDatabase(fileId);
		res.json({ message: 'Restore successful' });
	} catch (err) {
		next(err);
	}
});

export default router;
