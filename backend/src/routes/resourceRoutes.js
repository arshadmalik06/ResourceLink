import express from 'express';
import { getAllResources, addResource, updateResourceStatus } from '../controllers/resource.js';
import { requireAuth } from '../config/auth.js';
const router = express.Router();

// GET /api/resources—Public discovery endpoint for (Map/Dashboard)
router.get('/', getAllResources);
// POST /api/resources—Protected endpoint for verified institutions to publish equipment
router.post('/', requireAuth, addResource);
// PATCH /api/resources/:id/status
router.patch('/:id/status', requireAuth, updateResourceStatus);

export default router;