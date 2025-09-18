const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { auth, ensureOwnClub } = require('../middlewares/auth');

// Routes publiques (sans authentification)
router.get('/public', eventController.getPublicEvents);
router.get('/club/:clubId', eventController.getEventsByClub); // Route publique pour obtenir les événements d'un club

// Routes protégées pour tous les événements (admin et clubs)
router.get('/', auth(['admin', 'club']), eventController.getEvents);
router.get('/stats', auth(['admin']), eventController.getEventStats);
router.get('/:id', auth(['admin', 'club']), eventController.getEventById);

// Routes pour les clubs
router.get('/my/events', auth(['club']), eventController.getMyEvents);
router.post('/', auth(['admin', 'club']), eventController.createEvent);
router.put('/:id', auth(['admin', 'club']), ensureOwnClub, eventController.updateEvent);
router.delete('/:id', auth(['admin', 'club']), ensureOwnClub, eventController.deleteEvent);

// Routes admin uniquement
router.put('/:id/validate', auth(['admin']), eventController.validateEvent);

module.exports = router;
