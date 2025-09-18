const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middlewares/auth');

// Authentification
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Gestion des mots de passe
router.post('/forgot-password', authController.forgotPassword);
router.post('/change-password', auth(), authController.changePassword);

// Vérification du token
router.get('/verify', auth(), authController.verifyToken);

module.exports = router;
