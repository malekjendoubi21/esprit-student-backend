const express = require('express');
const router = express.Router();
const clubController = require('../controllers/clubController');
const { auth, ensureOwnClub } = require('../middlewares/auth');

// Routes publiques (sans authentification)
router.get('/public', clubController.getPublicClubs);
router.get('/:id/public', clubController.getPublicClubById);

// Routes protégées (avec authentification admin)
router.get('/', auth(['admin']), clubController.getClubs);
router.get('/stats', auth(['admin']), clubController.getClubStats);
router.post('/', auth(['admin']), clubController.createClub);
router.get('/:id', auth(['admin', 'club']), clubController.getClubById);

// Routes pour les clubs connectés
router.get('/my/profile', auth(['club']), clubController.getMyProfile);
router.get('/my/stats', auth(['club']), clubController.getMyStats);
router.put('/my/profile', auth(['club']), ensureOwnClub, clubController.updateProfile);
router.post('/my/change-password', auth(['club']), clubController.changePassword);

// Routes admin pour la gestion des clubs
router.put('/:id/profile', auth(['admin']), clubController.updateProfile);
router.delete('/:id', auth(['admin']), clubController.deleteClub);

module.exports = router;
