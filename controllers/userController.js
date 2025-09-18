const User = require('../models/User');
const Club = require('../models/Club');
const bcrypt = require('bcrypt');
const generatePassword = require('../utils/generatePassword');
const { sendMail } = require('../utils/mailService');

// Obtenir tous les utilisateurs avec pagination et filtres
exports.getUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            role,
            statut,
            search
        } = req.query;

        // Construire le filtre
        const filter = {};
        if (role) filter.role = role;
        if (statut) filter.statut = statut;
        if (search) {
            filter.$or = [
                { nom: { $regex: search, $options: 'i' } },
                { prenom: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculer pagination
        const skip = (page - 1) * limit;

        // Exécuter la requête
        const users = await User.find(filter)
            .populate('clubAssigne', 'nom')
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: users.length,
                    totalItems: total
                }
            }
        });

    } catch (err) {
        console.error('Erreur getUsers:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des utilisateurs'
        });
    }
};

// Obtenir un utilisateur par ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .populate('clubAssigne', 'nom categorie')
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (err) {
        console.error('Erreur getUserById:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'utilisateur'
        });
    }
};

// Créer un nouvel utilisateur
exports.createUser = async (req, res) => {
    try {
        const {
            email,
            nom,
            prenom,
            role = 'club_manager',
            telephone,
            permissions = [],
            clubAssigne
        } = req.body;

        // Vérifications
        if (!email || !nom || !prenom) {
            return res.status(400).json({
                success: false,
                message: 'Email, nom et prénom sont requis'
            });
        }

        // Vérifier si l'email existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Un utilisateur avec cet email existe déjà'
            });
        }

        // Vérifier le club assigné si fourni
        if (clubAssigne) {
            const club = await Club.findById(clubAssigne);
            if (!club) {
                return res.status(400).json({
                    success: false,
                    message: 'Club assigné non trouvé'
                });
            }
        }

        // Générer un mot de passe
        const motDePasse = generatePassword();
        const hashedPassword = await bcrypt.hash(motDePasse, 10);

        // Créer l'utilisateur
        const userData = {
            email,
            password: hashedPassword,
            nom,
            prenom,
            role,
            telephone,
            permissions,
            clubAssigne: clubAssigne || null
        };

        const user = new User(userData);
        await user.save();

        // Envoyer le mot de passe par email
        try {
            await sendMail(
                email,
                'Création de votre compte - Esprit Student',
                `Bonjour ${prenom} ${nom},\n\nVotre compte utilisateur a été créé.\n\nVos identifiants :\nEmail: ${email}\nMot de passe: ${motDePasse}\nRôle: ${role}\n\nVeuillez vous connecter et changer votre mot de passe.\n\nCordialement,\nL'équipe Esprit Student`
            );
        } catch (emailErr) {
            console.error('Erreur envoi email:', emailErr);
        }

        // Retourner l'utilisateur créé (sans mot de passe)
        const userResponse = await User.findById(user._id)
            .populate('clubAssigne', 'nom')
            .select('-password');

        res.status(201).json({
            success: true,
            message: 'Utilisateur créé avec succès',
            data: userResponse,
            motDePasse // En développement seulement
        });

    } catch (err) {
        console.error('Erreur createUser:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de l\'utilisateur'
        });
    }
};

// Mettre à jour un utilisateur
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nom,
            prenom,
            role,
            telephone,
            statut,
            permissions,
            clubAssigne
        } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier le club assigné si fourni
        if (clubAssigne && clubAssigne !== user.clubAssigne?.toString()) {
            const club = await Club.findById(clubAssigne);
            if (!club) {
                return res.status(400).json({
                    success: false,
                    message: 'Club assigné non trouvé'
                });
            }
        }

        // Mettre à jour les champs
        if (nom) user.nom = nom;
        if (prenom) user.prenom = prenom;
        if (role) user.role = role;
        if (telephone !== undefined) user.telephone = telephone;
        if (statut) user.statut = statut;
        if (permissions) user.permissions = permissions;
        if (clubAssigne !== undefined) user.clubAssigne = clubAssigne || null;

        await user.save();

        // Retourner l'utilisateur mis à jour
        const updatedUser = await User.findById(id)
            .populate('clubAssigne', 'nom')
            .select('-password');

        res.json({
            success: true,
            message: 'Utilisateur mis à jour avec succès',
            data: updatedUser
        });

    } catch (err) {
        console.error('Erreur updateUser:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour de l\'utilisateur'
        });
    }
};

// Supprimer un utilisateur
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier si l'utilisateur est assigné à un club
        if (user.clubAssigne) {
            await Club.findByIdAndUpdate(user.clubAssigne, {
                $unset: { responsable: '' }
            });
        }

        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Utilisateur supprimé avec succès'
        });

    } catch (err) {
        console.error('Erreur deleteUser:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de l\'utilisateur'
        });
    }
};

// Réinitialiser le mot de passe d'un utilisateur
exports.resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const newPassword = generatePassword();
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Envoyer le nouveau mot de passe par email
        try {
            await sendMail(
                user.email,
                'Réinitialisation de votre mot de passe - Esprit Student',
                `Bonjour ${user.prenom} ${user.nom},\n\nVotre mot de passe a été réinitialisé.\n\nNouveau mot de passe: ${newPassword}\n\nVeuillez vous connecter et changer votre mot de passe.\n\nCordialement,\nL'équipe Esprit Student`
            );
        } catch (emailErr) {
            console.error('Erreur envoi email:', emailErr);
        }

        res.json({
            success: true,
            message: 'Mot de passe réinitialisé avec succès',
            newPassword // En développement seulement
        });

    } catch (err) {
        console.error('Erreur resetUserPassword:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la réinitialisation du mot de passe'
        });
    }
};

// Obtenir les statistiques des utilisateurs
exports.getUserStats = async (req, res) => {
    try {
        const stats = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ statut: 'actif' }),
            User.countDocuments({ statut: 'inactif' }),
            User.countDocuments({ statut: 'suspendu' }),
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);

        const [
            totalUsers,
            activeUsers,
            inactiveUsers,
            suspendedUsers,
            usersByRole
        ] = stats;

        res.json({
            success: true,
            data: {
                total: totalUsers,
                active: activeUsers,
                inactive: inactiveUsers,
                suspended: suspendedUsers,
                byRole: usersByRole
            }
        });

    } catch (err) {
        console.error('Erreur getUserStats:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques'
        });
    }
};