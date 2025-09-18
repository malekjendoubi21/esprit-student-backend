const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Club = require('../models/Club');

// Middleware d'authentification
const auth = (roles = []) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

            if (!token) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Token d\'accès requis' 
                });
            }

            // Vérifier le token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Vérifier si l'utilisateur existe toujours
            let user = null;
            if (decoded.userType === 'admin') {
                // Pour les admins, chercher d'abord dans Admin puis dans User
                user = await Admin.findById(decoded.id);
                if (!user) {
                    // Si pas trouvé dans Admin, chercher dans User avec role admin
                    user = await User.findById(decoded.id);
                    if (user && user.role !== 'admin') {
                        user = null; // Ce n'est pas un admin valide
                    }
                }
            } else if (decoded.userType === 'user') {
                user = await User.findById(decoded.id);
            } else if (decoded.userType === 'club') {
                user = await Club.findById(decoded.id);
            }

            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Utilisateur non trouvé' 
                });
            }

            // Vérifier le statut de l'utilisateur (sauf pour admin)
            if (decoded.userType !== 'admin' && user.statut && user.statut !== 'actif') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Compte désactivé ou suspendu' 
                });
            }

            // Vérifier les rôles autorisés
            if (roles.length > 0 && !roles.includes(decoded.userType)) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Accès refusé - permissions insuffisantes' 
                });
            }

            // Ajouter les informations utilisateur à la requête
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                userType: decoded.userType,
                userData: user
            };

            next();
        } catch (err) {
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Token invalide' 
                });
            } else if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Token expiré' 
                });
            } else {
                console.error('Erreur middleware auth:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erreur interne du serveur' 
                });
            }
        }
    };
};

// Middleware pour vérifier les permissions spécifiques
const checkPermission = (permission) => {
    return (req, res, next) => {
        const user = req.user;
        
        // Admin a toutes les permissions
        if (user.role === 'admin') {
            return next();
        }
        
        // Vérifier si l'utilisateur a la permission
        if (user.userType === 'user' && user.userData.hasPermission && user.userData.hasPermission(permission)) {
            return next();
        }
        
        return res.status(403).json({ 
            success: false, 
            message: `Permission '${permission}' requise` 
        });
    };
};

// Middleware pour s'assurer que le club ne peut modifier que ses propres données
const ensureOwnClub = async (req, res, next) => {
    try {
        const user = req.user;
        
        // Admin peut tout faire
        if (user.role === 'admin') {
            return next();
        }
        
        // Si c'est un club, il ne peut modifier que ses propres données
        if (user.userType === 'club') {
            const clubId = req.params.id || req.params.clubId || req.body.clubId;
            
            if (clubId && clubId !== user.id) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Vous ne pouvez modifier que votre propre club' 
                });
            }
        }
        
        // Si c'est un user avec un club assigné
        if (user.userType === 'user' && user.userData.clubAssigne) {
            const clubId = req.params.id || req.params.clubId || req.body.clubId;
            
            if (clubId && clubId !== user.userData.clubAssigne.toString()) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Vous ne pouvez modifier que le club qui vous est assigné' 
                });
            }
        }
        
        next();
    } catch (err) {
        console.error('Erreur ensureOwnClub:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur interne du serveur' 
        });
    }
};

// Middleware d'authentification optionnelle
const optionalAuth = () => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

            if (!token) {
                // Pas de token, continuer sans authentification
                req.user = null;
                return next();
            }

            // Vérifier le token s'il existe
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Rechercher l'utilisateur selon le type
            let user;
            if (decoded.userType === 'admin') {
                user = await Admin.findById(decoded.id).select('-password');
            } else {
                user = await User.findById(decoded.id).select('-password');
            }

            if (!user) {
                // Utilisateur non trouvé, continuer sans authentification
                req.user = null;
                return next();
            }

            // Ajouter les informations utilisateur à la requête
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                userType: decoded.userType,
                nom: user.nom,
                prenom: user.prenom,
                permissions: user.permissions || []
            };

            next();
        } catch (error) {
            // Erreur de token, continuer sans authentification
            req.user = null;
            next();
        }
    };
};

module.exports = {
    auth,
    optionalAuth,
    checkPermission,
    ensureOwnClub
};
