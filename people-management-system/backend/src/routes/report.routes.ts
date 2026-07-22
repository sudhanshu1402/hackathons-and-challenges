import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/alphabetical', reportController.alphabeticalList);
router.get('/age', reportController.groupByAge);
router.get('/qualification', reportController.groupByQualification);
router.get('/location', reportController.groupByLocation);
router.get('/overview', reportController.overview);

export default router;
