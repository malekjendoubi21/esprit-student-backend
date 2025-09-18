const Admin = require('../models/Admin');
const Club = require('../models/Club');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendMail } = require('../utils/mailService');
const generatePassword = require('../utils/generatePassword');
const Logger = require('../utils/logger');

// Fonction de connexion universelle
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email et mot de passe requis' 
            });
        }

        // Chercher dans l'ordre : Admin, User, Club
        let user = null;
        let role = null;
        let userType = null;

        // 1. Chercher admin
        user = await Admin.findOne({ email });
        if (user) {
            role = 'admin';
            userType = 'admin';
        }

        // 2. Chercher user (seulement si pas trouvé en admin)
        if (!user) {
            user = await User.findOne({ email });
            if (user) {
                role = user.role;
                // Si l'utilisateur a le role admin, alors userType = admin
                if (user.role === 'admin') {
                    userType = 'admin';
                } else {
                    userType = 'user';
                }
            }
        }

        // 3. Chercher club (seulement si pas trouvé en admin ou user)
        if (!user) {
            user = await Club.findOne({ email });
            if (user) {
                role = 'club';
                userType = 'club';
            }
        }

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Utilisateur non trouvé' 
            });
        }

        // Vérifier le statut (sauf pour admin)
        if (userType !== 'admin' && user.statut && user.statut !== 'actif') {
            return res.status(403).json({ 
                success: false, 
                message: 'Compte désactivé ou suspendu' 
            });
        }

        // Vérifier le mot de passe
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Mot de passe incorrect' 
            });
        }

        // Mettre à jour la dernière connexion
        if (userType !== 'admin') {
            user.derniereConnexion = new Date();
            await user.save();
        }

        // Générer le token JWT
        const tokenPayload = {
            id: user._id,
            role: role,
            userType: userType,
            email: user.email
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { 
            expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
        });

        // Préparer les données utilisateur (sans mot de passe)
        const userData = {
            id: user._id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            role: role,
            userType: userType
        };

        // Ajouter des données spécifiques selon le type
        if (userType === 'club') {
            userData.premiereConnexion = user.premiereConnexion;
            userData.profileComplet = user.profileComplet;
            userData.statut = user.statut;
        }

        // Logger la connexion
        try {
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            await Logger.logLogin(user._id, userType, ipAddress, userAgent);
        } catch (logError) {
            console.error('Erreur lors du logging de connexion:', logError);
            // Ne pas faire échouer la connexion si le logging échoue
        }

        res.json({ 
            success: true,
            message: 'Connexion réussie',
            token,
            user: userData
        });

    } catch (err) {
        console.error('Erreur login:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur interne du serveur' 
        });
    }
};

// Fonction de déconnexion
exports.logout = async (req, res) => {
    try {
        // Note: Avec JWT, la déconnexion côté serveur est limitée
        // Le token reste valide jusqu'à expiration
        // On peut implémenter une blacklist si nécessaire
        
        res.json({ 
            success: true,
            message: 'Déconnexion réussie' 
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
};

// Vérifier le token et retourner les infos utilisateur
exports.verifyToken = async (req, res) => {
    try {
        const user = req.user; // Mis par le middleware auth
        
        let userData = null;
        
        if (user.userType === 'admin') {
            // Chercher d'abord dans Admin, puis dans User avec role admin
            userData = await Admin.findById(user.id).select('-password');
            if (!userData) {
                userData = await User.findById(user.id).select('-password').populate('clubAssigne');
            }
        } else if (user.userType === 'user') {
            userData = await User.findById(user.id).select('-password').populate('clubAssigne');
        } else if (user.userType === 'club') {
            userData = await Club.findById(user.id).select('-password');
        }

        if (!userData) {
            return res.status(404).json({ 
                success: false, 
                message: 'Utilisateur non trouvé' 
            });
        }

        res.json({ 
            success: true,
            user: userData
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
};

// Réinitialisation du mot de passe
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email requis' 
            });
        }

        // Chercher dans Admin, User, Club
        let user = await Admin.findOne({ email });
        let userType = 'admin';
        
        if (!user) {
            user = await User.findOne({ email });
            userType = 'user';
        }
        
        if (!user) {
            user = await Club.findOne({ email });
            userType = 'club';
        }
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Utilisateur non trouvé' 
            });
        }

        const newPassword = generatePassword();
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        try {
            await sendMail(
                email, 
                'Réinitialisation de votre mot de passe - Esprit Student', 
                `Votre nouveau mot de passe est : ${newPassword}\n\nVeuillez le changer après votre prochaine connexion.`
            );
            
            res.json({ 
                success: true,
                message: 'Nouveau mot de passe envoyé par email' 
            });
        } catch (emailErr) {
            // Même si l'email échoue, on a changé le mot de passe
            console.error('Erreur envoi email:', emailErr);
            res.json({ 
                success: true,
                message: `Mot de passe réinitialisé. Nouveau mot de passe: ${newPassword}` 
            });
        }

    } catch (err) {
        console.error('Erreur forgot password:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur interne du serveur' 
        });
    }
};

// Changer le mot de passe (utilisateur connecté)
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const userType = req.user.userType;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mot de passe actuel et nouveau mot de passe requis' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
            });
        }

        // Récupérer l'utilisateur selon son type
        let user = null;
        if (userType === 'admin') {
            user = await Admin.findById(userId);
        } else if (userType === 'user') {
            user = await User.findById(userId);
        } else if (userType === 'club') {
            user = await Club.findById(userId);
        }

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Utilisateur non trouvé' 
            });
        }

        // Vérifier le mot de passe actuel
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mot de passe actuel incorrect' 
            });
        }

        // Hasher et sauvegarder le nouveau mot de passe
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ 
            success: true,
            message: 'Mot de passe changé avec succès' 
        });

    } catch (err) {
        console.error('Erreur change password:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur interne du serveur' 
        });
    }
};

// Fonction pour créer un club (utilisée par admin)
exports.createClub = async (req, res) => {
    try {
        const { nom, email } = req.body;
        const motDePasse = generatePassword();
        const hashedPassword = await bcrypt.hash(motDePasse, 10);

        const club = new Club({ nom, email, password: hashedPassword });
        await club.save();

        // Envoi mot de passe par email
        await sendMail(email, 'Votre compte club', `Votre mot de passe est : ${motDePasse}`);

        res.status(201).json({ message: 'Club créé et mot de passe envoyé' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
