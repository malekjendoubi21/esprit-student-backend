const express = require('express');
const router = express.Router();
const firstLoginController = require('../controllers/firstLoginController');
const { auth } = require('../middlewares/auth');

// Routes pour la première connexion des clubs

// Vérifier si c'est la première connexion
router.get('/check', auth(['club']), firstLoginController.checkFirstLogin);

// Obtenir le guide d'aide
router.get('/guide', auth(['club']), firstLoginController.getFirstLoginGuide);

// Compléter le profil lors de la première connexion
router.post('/complete', auth(['club']), firstLoginController.completeFirstLoginProfile);

// Sauvegarder un brouillon du profil
router.post('/save-draft', auth(['club']), firstLoginController.saveDraftProfile);

module.exports = router;