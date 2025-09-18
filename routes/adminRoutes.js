const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth } = require('../middlewares/auth');

// Dashboard et statistiques
router.get('/dashboard/stats', auth(['admin']), adminController.getDashboardStats);
router.get('/logs/recent', auth(['admin']), adminController.getRecentLogs);
router.get('/logs', auth(['admin']), adminController.getAllLogs);
router.get('/logs/stats', auth(['admin']), adminController.getLogsStats);
router.post('/logs/test', auth(['admin']), adminController.createTestLogs);
router.delete('/logs/test', auth(['admin']), adminController.deleteTestLogs);
router.delete('/logs/orphans', auth(['admin']), adminController.cleanOrphanLogs);

// Gestion des clubs
router.post('/clubs', auth(['admin']), adminController.createClub);
router.put('/clubs/:id/status', auth(['admin']), adminController.updateClubStatus);

// Gestion des événements
router.put('/events/:id/status', auth(['admin']), adminController.updateEventStatus);

module.exports = router;
