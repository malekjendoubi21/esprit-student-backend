const Club = require('../models/Club');
const Event = require('../models/Event');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { sendMail } = require('../utils/mailService');
const { ObjectId } = require('mongoose').Types;

// Obtenir tous les clubs avec pagination et filtres
exports.getClubs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            statut,
            categorie,
            search
        } = req.query;

        // Construire le filtre
        const filter = {};
        if (statut) filter.statut = statut;
        if (categorie) filter.categorie = categorie;
        if (search) {
            filter.$or = [
                { nom: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculer pagination
        const skip = (page - 1) * limit;

        // Exécuter la requête
        const clubs = await Club.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Club.countDocuments(filter);

        res.json({
            success: true,
            data: {
                clubs,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: clubs.length,
                    totalItems: total
                }
            }
        });

    } catch (err) {
        console.error('Erreur getClubs:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des clubs'
        });
    }
};

// Obtenir tous les clubs publiquement (sans authentification)
exports.getPublicClubs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            categorie,
            search
        } = req.query;

        // Construire le filtre - seulement les clubs actifs et validés
        const filter = {
            statut: 'actif',
            valide: true
        };
        
        if (categorie && categorie !== 'Tous') filter.categorie = categorie;
        if (search) {
            filter.$or = [
                { nom: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculer pagination
        const skip = (page - 1) * limit;

        // Exécuter la requête avec seulement les champs publics
        const clubs = await Club.find(filter)
            .select('nom description categorie dateCreation fondation logo images activites reseauxSociaux contact nombreMembres president stats lienRecrutement imageCouverture detailsComplets')
            .populate('president', 'nom prenom')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Club.countDocuments(filter);

        res.json({
            success: true,
            data: {
                clubs,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: clubs.length,
                    totalItems: total
                }
            }
        });

    } catch (err) {
        console.error('Erreur getPublicClubs:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des clubs publics'
        });
    }
};

// Obtenir un club par ID publiquement (sans authentification)
exports.getPublicClubById = async (req, res) => {
    try {
        const { id } = req.params;

        const club = await Club.findOne({ 
            _id: id, 
            statut: 'actif', 
            valide: true 
        })
        .select('nom description categorie dateCreation fondation logo images activites reseauxSociaux contact nombreMembres president stats detailsComplets lienRecrutement imageCouverture')
        .populate('president', 'nom prenom');

        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        res.json({
            success: true,
            data: club
        });

    } catch (err) {
        console.error('Erreur getPublicClubById:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du club'
        });
    }
};

// Obtenir un club par ID
exports.getClubById = async (req, res) => {
    try {
        const { id } = req.params;

        const club = await Club.findById(id)
            .populate('events')
            .select('-password');

        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        // Ajouter les statistiques des événements
        const eventStats = await Event.aggregate([
            { $match: { clubId: club._id } },
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                ...club.toObject(),
                eventStats
            }
        });

    } catch (err) {
        console.error('Erreur getClubById:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du club'
        });
    }
};

// Mettre à jour le profil du club
exports.updateProfile = async (req, res) => {
    try {
        const clubId = req.params.id || req.user.id;
        
        // Vérifier que le club peut modifier ses données
        if (req.user.userType === 'club' && clubId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez modifier que votre propre profil'
            });
        }

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        // Champs autorisés à être modifiés
        const allowedFields = [
            'nom', 'description', 'membres', 'president', 'fondation',
            'activites', 'lienRecrutement', 'reseauxSociaux', 'siteWeb',
            'detailsComplets', 'contact', 'categorie', 'images', 'imageCouverture'
        ];

        // Mettre à jour seulement les champs autorisés
        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) {
                if (key === 'detailsComplets' && club.detailsComplets) {
                    // Merger les détails complets
                    club.detailsComplets = { ...club.detailsComplets.toObject(), ...req.body[key] };
                } else if (key === 'reseauxSociaux' && club.reseauxSociaux) {
                    // Merger les réseaux sociaux
                    club.reseauxSociaux = { ...club.reseauxSociaux.toObject(), ...req.body[key] };
                } else if (key === 'contact' && club.contact) {
                    // Merger les informations de contact
                    club.contact = { ...club.contact.toObject(), ...req.body[key] };
                } else if (key === 'president' && club.president) {
                    // Merger les informations du président
                    club.president = { ...club.president.toObject(), ...req.body[key] };
                } else {
                    club[key] = req.body[key];
                }
            }
        });

        // Marquer la première connexion comme terminée
        if (club.premiereConnexion) {
            club.premiereConnexion = false;
        }

        // Le middleware pre('save') va automatiquement mettre à jour profileComplet
        await club.save();

        // Retourner le club mis à jour
        const updatedClub = await Club.findById(clubId)
            .select('-password');

        res.json({
            success: true,
            message: 'Profil mis à jour avec succès',
            data: updatedClub
        });

    } catch (err) {
        console.error('Erreur updateProfile:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du profil'
        });
    }
};

// Obtenir le profil du club connecté
exports.getMyProfile = async (req, res) => {
    try {
        const club = await Club.findById(req.user.id)
            .select('-password');

        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        // Obtenir les statistiques des événements
        const eventStats = await Event.aggregate([
            { $match: { clubId: club._id } },
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Obtenir les derniers événements
        const recentEvents = await Event.find({ clubId: club._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('titre dateDebut statut typeEvent');

        res.json({
            success: true,
            data: {
                ...club.toObject(),
                eventStats,
                recentEvents
            }
        });

    } catch (err) {
        console.error('Erreur getMyProfile:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du profil'
        });
    }
};

// Obtenir les statistiques du club connecté
exports.getMyStats = async (req, res) => {
    try {
        const clubId = ObjectId.isValid(req.user.id) 
            ? new ObjectId(req.user.id)
            : req.user.id;

        // Statistiques des événements
        const eventStats = await Event.aggregate([
            { $match: { clubId: clubId } },
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Total des événements
        const totalEvents = await Event.countDocuments({ clubId: clubId });

        // Événements par mois (derniers 6 mois)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const eventsByMonth = await Event.aggregate([
            { 
                $match: { 
                    clubId: clubId,
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Événements en attente
        const pendingEvents = await Event.countDocuments({ 
            clubId: clubId, 
            statut: 'en_attente' 
        });

        // Événements approuvés
        const approvedEvents = await Event.countDocuments({ 
            clubId: clubId, 
            statut: 'approuve' 
        });

        // Événements rejetés
        const rejectedEvents = await Event.countDocuments({ 
            clubId: clubId, 
            statut: 'rejete' 
        });

        res.json({
            success: true,
            data: {
                totalEvents,
                pendingEvents,
                approvedEvents,
                rejectedEvents,
                eventStats,
                eventsByMonth
            }
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques'
        });
    }
};

// Changer le mot de passe du club
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const clubId = req.user.id;

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

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        // Vérifier le mot de passe actuel
        const isMatch = await bcrypt.compare(currentPassword, club.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Mot de passe actuel incorrect'
            });
        }

        // Hasher et sauvegarder le nouveau mot de passe
        club.password = await bcrypt.hash(newPassword, 10);
        await club.save();

        res.json({
            success: true,
            message: 'Mot de passe changé avec succès'
        });

    } catch (err) {
        console.error('Erreur changePassword:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du changement de mot de passe'
        });
    }
};

// Supprimer un club (Admin uniquement)
exports.deleteClub = async (req, res) => {
    try {
        const { id } = req.params;

        const club = await Club.findById(id);
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        // Supprimer tous les événements du club
        await Event.deleteMany({ clubId: id });

        // Mettre à jour les utilisateurs assignés à ce club
        await User.updateMany(
            { clubAssigne: id },
            { $unset: { clubAssigne: '' } }
        );

        // Supprimer le club
        await Club.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Club supprimé avec succès'
        });

    } catch (err) {
        console.error('Erreur deleteClub:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du club'
        });
    }
};

// Obtenir les statistiques des clubs
exports.getClubStats = async (req, res) => {
    try {
        const stats = await Promise.all([
            Club.countDocuments(),
            Club.countDocuments({ statut: 'actif' }),
            Club.countDocuments({ statut: 'en_attente' }),
            Club.countDocuments({ statut: 'inactif' }),
            Club.countDocuments({ profileComplet: true }),
            Club.aggregate([
                { $group: { _id: '$categorie', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);

        const [
            totalClubs,
            activeClubs,
            pendingClubs,
            inactiveClubs,
            completedProfiles,
            clubsByCategory
        ] = stats;

        res.json({
            success: true,
            data: {
                total: totalClubs,
                active: activeClubs,
                pending: pendingClubs,
                inactive: inactiveClubs,
                completedProfiles,
                byCategory: clubsByCategory
            }
        });

    } catch (err) {
        console.error('Erreur getClubStats:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques'
        });
    }
};

// Créer un nouveau club (par admin avec validation automatique)
exports.createClub = async (req, res) => {
    try {
        const {
            nom,
            email,
            categorie = 'Autre', // Valeur par défaut
            description = '',
            telephone = ''
        } = req.body;

        // Validation des champs obligatoires (seulement nom et email)
        if (!nom || !email) {
            return res.status(400).json({
                success: false,
                message: 'Le nom et l\'email sont obligatoires'
            });
        }

        // Validation du format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Format d\'email invalide'
            });
        }

        // Vérifier si le club existe déjà
        const existingClub = await Club.findOne({ 
            $or: [{ email }, { nom }] 
        });

        if (existingClub) {
            return res.status(400).json({
                success: false,
                message: 'Un club avec cet email ou ce nom existe déjà'
            });
        }

        // Générer un mot de passe temporaire (8 caractères)
        const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Créer le club avec les informations minimales
        const newClub = new Club({
            nom,
            email,
            password: hashedPassword,
            description: description || `Club ${nom}`,
            categorie,
            statut: 'actif',
            contact: {
                telephone,
                email
            },
            // Validation automatique par admin
            valide: true,
            valideePar: req.user.id,
            dateValidation: new Date(),
            // Le club devra compléter son profil à la première connexion
            premiereConnexion: true,
            profileComplet: false
        });

        const savedClub = await newClub.save();

        // Envoyer le mot de passe par email
        try {
            const emailSubject = 'Votre compte club ESPRIT a été créé';
            const emailText = `
Bonjour,

Votre compte club "${nom}" a été créé avec succès sur la plateforme ESPRIT.

Vos informations de connexion :
- Email : ${email}
- Mot de passe temporaire : ${tempPassword}

⚠️ IMPORTANT : 
- Connectez-vous dès que possible pour compléter votre profil
- Vous devrez changer votre mot de passe lors de votre première connexion
- Complétez toutes les informations de votre club pour activer toutes les fonctionnalités

Lien de connexion : [URL_DE_CONNEXION]

L'équipe ESPRIT
            `;

            await sendMail(email, emailSubject, emailText);
        } catch (emailError) {
            // Email error handled silently
            // Ne pas faire échouer la création si l'email échoue
        }

        res.status(201).json({
            success: true,
            message: `Club créé avec succès. Le mot de passe a été envoyé à ${email}`,
            data: {
                club: {
                    _id: savedClub._id,
                    nom: savedClub.nom,
                    email: savedClub.email,
                    categorie: savedClub.categorie,
                    statut: savedClub.statut,
                    valide: savedClub.valide,
                    premiereConnexion: savedClub.premiereConnexion,
                    profileComplet: savedClub.profileComplet,
                    createdAt: savedClub.createdAt
                },
                passwordSent: true
            }
        });

    } catch (err) {
        console.error('Erreur createClub:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du club'
        });
    }
};
