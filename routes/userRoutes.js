const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, checkPermission } = require('../middlewares/auth');

// Routes pour la gestion des utilisateurs (Admin uniquement)

// Obtenir tous les utilisateurs
router.get('/', auth(['admin']), userController.getUsers);

// Obtenir les statistiques des utilisateurs
router.get('/stats', auth(['admin']), userController.getUserStats);

// Obtenir un utilisateur par ID
router.get('/:id', auth(['admin']), userController.getUserById);

// Créer un nouvel utilisateur
router.post('/', auth(['admin']), userController.createUser);

// Mettre à jour un utilisateur
router.put('/:id', auth(['admin']), userController.updateUser);

// Supprimer un utilisateur
router.delete('/:id', auth(['admin']), userController.deleteUser);

// Réinitialiser le mot de passe d'un utilisateur
router.post('/:id/reset-password', auth(['admin']), userController.resetUserPassword);

module.exports = router;