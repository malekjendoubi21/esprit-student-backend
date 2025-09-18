const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');

// Routes pour la réinitialisation de mot de passe
router.post('/request-reset', passwordResetController.requestPasswordReset);
router.post('/reset', passwordResetController.resetPassword);
router.get('/verify-token', passwordResetController.verifyResetToken);

module.exports = router;