const express = require('express');
const {
    createDefaultAdmin,
    createMultipleAdmins,
    resetAdminPassword,
    listAdmins
} = require('../scripts/createAdmin');
const { auth, optionalAuth } = require('../middlewares/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * @route   GET /api/admin-management/list
 * @desc    Liste tous les administrateurs
 * @access  Admin uniquement
 */
router.get('/list', auth(['admin']), async (req, res) => {
    try {
        // Vérifier que l'utilisateur est admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé. Seuls les admins peuvent voir cette liste.'
            });
        }

        const admins = await listAdmins();
        
        res.json({
            success: true,
            message: 'Liste des administrateurs récupérée',
            data: admins,
            count: admins.length
        });

    } catch (error) {
        console.error('Erreur liste admins:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des admins',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/admin-management/create-default
 * @desc    Crée un admin par défaut
 * @access  Admin uniquement ou première utilisation
 */
router.post('/create-default', optionalAuth(), async (req, res) => {
    try {
        // Vérifier s'il y a déjà des admins
        const existingAdminCount = await User.countDocuments({ role: 'admin' });
        
        // Si des admins existent, vérifier les permissions
        if (existingAdminCount > 0) {
            // Vérifier l'authentification pour les créations ultérieures
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Accès refusé. Seuls les admins peuvent créer d\'autres admins.'
                });
            }
        }

        const admin = await createDefaultAdmin();
        
        res.json({
            success: true,
            message: 'Admin par défaut créé avec succès',
            data: {
                id: admin._id,
                nom: admin.nom,
                prenom: admin.prenom,
                email: admin.email,
                role: admin.role
            },
            warning: 'Changez le mot de passe par défaut lors de la première connexion'
        });

    } catch (error) {
        console.error('Erreur création admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de l\'admin',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/admin-management/create-multiple
 * @desc    Crée plusieurs admins
 * @access  Admin uniquement
 */
router.post('/create-multiple', auth(['admin']), async (req, res) => {
    try {
        // Vérifier que l'utilisateur est admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé. Seuls les admins peuvent créer d\'autres admins.'
            });
        }

        const admins = await createMultipleAdmins();
        
        res.json({
            success: true,
            message: `${admins.length} admin(s) créé(s) avec succès`,
            data: admins.map(admin => ({
                id: admin._id,
                nom: admin.nom,
                prenom: admin.prenom,
                email: admin.email,
                role: admin.role
            })),
            warning: 'Changez tous les mots de passe par défaut'
        });

    } catch (error) {
        console.error('Erreur création admins multiples:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création des admins',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/admin-management/reset-password
 * @desc    Réinitialise le mot de passe d'un admin
 * @access  Admin uniquement
 */
router.post('/reset-password', auth(['admin']), async (req, res) => {
    try {
        // Vérifier que l'utilisateur est admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé. Seuls les admins peuvent réinitialiser les mots de passe.'
            });
        }

        const { email, newPassword } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email requis pour la réinitialisation'
            });
        }

        const admin = await resetAdminPassword(email, newPassword);
        
        res.json({
            success: true,
            message: `Mot de passe réinitialisé pour ${email}`,
            data: {
                id: admin._id,
                email: admin.email,
                isFirstLogin: admin.isFirstLogin
            }
        });

    } catch (error) {
        console.error('Erreur réinitialisation mot de passe:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la réinitialisation du mot de passe',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/admin-management/check-setup
 * @desc    Vérifie si l'application est configurée (au moins un admin existe)
 * @access  Public (pour l'initialisation)
 */
router.get('/check-setup', async (req, res) => {
    try {
        const adminCount = await User.countDocuments({ role: 'admin' });
        const isSetup = adminCount > 0;
        
        res.json({
            success: true,
            data: {
                isSetup,
                adminCount,
                needsInitialSetup: !isSetup
            }
        });

    } catch (error) {
        console.error('Erreur vérification setup:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification du setup',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/admin-management/initial-setup
 * @desc    Configuration initiale - crée le premier admin
 * @access  Public (uniquement si aucun admin n'existe)
 */
router.post('/initial-setup', async (req, res) => {
    try {
        // Vérifier qu'aucun admin n'existe
        const existingAdminCount = await User.countDocuments({ role: 'admin' });
        
        if (existingAdminCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'L\'application est déjà configurée'
            });
        }

        const { nom, prenom, email, password } = req.body;

        // Validation des données
        if (!nom || !prenom || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont requis'
            });
        }

        // Créer l'admin personnalisé
        const bcrypt = require('bcrypt');
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const admin = new User({
            nom,
            prenom,
            email,
            password: hashedPassword,
            role: 'admin',
            permissions: ['manage_users', 'create_club', 'edit_club', 'delete_club', 'validate_event'],
            statut: 'actif',
            isFirstLogin: false // Admin créé manuellement
        });

        await admin.save();

        res.json({
            success: true,
            message: 'Configuration initiale terminée avec succès',
            data: {
                id: admin._id,
                nom: admin.nom,
                prenom: admin.prenom,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('Erreur configuration initiale:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la configuration initiale',
            error: error.message
        });
    }
});

module.exports = router;