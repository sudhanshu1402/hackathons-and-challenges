import { Router } from 'express';
import * as peopleController from '../controllers/people.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import multer from 'multer';

const router = Router();
const upload = multer();

router.use(authenticate);
router.post('/', peopleController.createPerson);
router.get('/', peopleController.listPeople);
router.get('/export', peopleController.exportPeople);
router.post('/import', upload.single('file'), requireRole('ADMIN'), peopleController.importPeople);
router.post('/bulk-delete', requireRole('ADMIN'), peopleController.bulkDeletePeople);
router.get('/:id/family', peopleController.getFamilyDetails);
router.get('/:id', peopleController.getPerson);
router.put('/:id', peopleController.updatePerson);
router.delete('/:id', requireRole('ADMIN'), peopleController.deletePerson);

export default router;
