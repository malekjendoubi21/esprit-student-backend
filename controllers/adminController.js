const Club = require('../models/Club');
const Event = require('../models/Event');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Log = require('../models/Log');
const bcrypt = require('bcrypt');
const generatePassword = require('../utils/generatePassword');
const { sendMail } = require('../utils/mailService');
const Logger = require('../utils/logger');

// Dashboard - Statistiques générales
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await Promise.all([
            // Nombre total de clubs
            Club.countDocuments(),
            // Nombre de clubs actifs
            Club.countDocuments({ statut: 'actif' }),
            // Nombre de clubs en attente
            Club.countDocuments({ statut: 'en_attente' }),
            // Nombre total d'événements
            Event.countDocuments(),
            // Nombre d'événements en attente de validation
            Event.countDocuments({ statut: 'en_attente' }),
            // Nombre d'événements validés ce mois
            Event.countDocuments({ 
                statut: 'valide',
                dateValidation: { 
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
                }
            }),
            // Nombre total d'utilisateurs
            User.countDocuments(),
            // Nombre d'utilisateurs actifs
            User.countDocuments({ statut: 'actif' }),
        ]);

        const [
            totalClubs,
            clubsActifs,
            clubsEnAttente,
            totalEvents,
            eventsEnAttente,
            eventsCeMois,
            totalUsers,
            usersActifs
        ] = stats;

        // Statistiques des événements par catégorie
        const eventsByCategory = await Event.aggregate([
            { $match: { statut: 'valide' } },
            { $group: { _id: '$typeEvent', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Statistiques des clubs par catégorie
        const clubsByCategory = await Club.aggregate([
            { $match: { statut: 'actif' } },
            { $group: { _id: '$categorie', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Événements récents (derniers 5)
        const recentEvents = await Event.find({ statut: 'valide' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('clubId', 'nom')
            .select('titre dateDebut clubId typeEvent');

        // Clubs récemment créés (derniers 5)
        const recentClubs = await Club.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('nom email statut createdAt categorie');

        // Activité de la semaine (nombre d'événements créés par jour)
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        
        const weeklyActivity = await Event.aggregate([
            { $match: { createdAt: { $gte: startOfWeek } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalClubs,
                    clubsActifs,
                    clubsEnAttente,
                    totalEvents,
                    eventsEnAttente,
                    eventsCeMois,
                    totalUsers,
                    usersActifs
                },
                charts: {
                    eventsByCategory,
                    clubsByCategory,
                    weeklyActivity
                },
                recent: {
                    events: recentEvents,
                    clubs: recentClubs
                }
            }
        });

    } catch (err) {
        console.error('Erreur getDashboardStats:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques'
        });
    }
};

// Créer un nouveau club
exports.createClub = async (req, res) => {
    try {
        const { nom, email, categorie, description } = req.body;

        // Vérifications
        if (!nom || !email || !categorie) {
            return res.status(400).json({
                success: false,
                message: 'Nom, email et catégorie sont requis'
            });
        }

        // Vérifier si l'email existe déjà
        const existingClub = await Club.findOne({ email });
        if (existingClub) {
            return res.status(400).json({
                success: false,
                message: 'Un club avec cet email existe déjà'
            });
        }

        // Générer un mot de passe
        const motDePasse = generatePassword();
        const hashedPassword = await bcrypt.hash(motDePasse, 10);

        // Créer le club
        const clubData = {
            nom,
            email,
            password: hashedPassword,
            categorie,
            description: description || '',
            statut: 'en_attente'
        };

        const club = new Club(clubData);
        await club.save();

        // Envoyer le mot de passe par email
        try {
            await sendMail(
                email,
                'Création de votre compte club - Esprit Student',
                `Bonjour,\n\nVotre compte club "${nom}" a été créé.\n\nVos identifiants :\nEmail: ${email}\nMot de passe: ${motDePasse}\n\nVeuillez vous connecter et compléter votre profil.\n\nCordialement,\nL'équipe Esprit Student`
            );
        } catch (emailErr) {
            console.error('Erreur envoi email:', emailErr);
        }

        res.status(201).json({
            success: true,
            message: 'Club créé avec succès',
            club: {
                id: club._id,
                nom: club.nom,
                email: club.email,
                statut: club.statut
            },
            motDePasse // En développement seulement
        });

    } catch (err) {
        console.error('Erreur createClub:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du club'
        });
    }
};

// Valider/Rejeter un club
exports.updateClubStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { statut, raisonRejet } = req.body;

        if (!['actif', 'inactif', 'suspendu', 'rejete'].includes(statut)) {
            return res.status(400).json({
                success: false,
                message: 'Statut invalide'
            });
        }

        const club = await Club.findById(id);
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        club.statut = statut;
        if (statut === 'rejete' && raisonRejet) {
            club.raisonRejet = raisonRejet;
        }

        await club.save();

        // Envoyer une notification par email
        try {
            let subject = '';
            let message = '';

            switch (statut) {
                case 'actif':
                    subject = 'Votre club a été activé';
                    message = `Félicitations ! Votre club "${club.nom}" a été activé. Vous pouvez maintenant créer des événements.`;
                    break;
                case 'rejete':
                    subject = 'Votre demande de club a été rejetée';
                    message = `Votre demande de club "${club.nom}" a été rejetée. Raison: ${raisonRejet || 'Non spécifiée'}`;
                    break;
                case 'suspendu':
                    subject = 'Votre club a été suspendu';
                    message = `Votre club "${club.nom}" a été temporairement suspendu.`;
                    break;
            }

            if (subject) {
                await sendMail(club.email, subject, message);
            }
        } catch (emailErr) {
            console.error('Erreur envoi email:', emailErr);
        }

        res.json({
            success: true,
            message: `Statut du club mis à jour: ${statut}`,
            club: {
                id: club._id,
                nom: club.nom,
                statut: club.statut
            }
        });

    } catch (err) {
        console.error('Erreur updateClubStatus:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du statut'
        });
    }
};

// Valider/Rejeter un événement
exports.updateEventStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { statut, raisonRejet } = req.body;

        if (!['valide', 'rejete', 'annule'].includes(statut)) {
            return res.status(400).json({
                success: false,
                message: 'Statut invalide'
            });
        }

        const event = await Event.findById(id).populate('clubId', 'nom email');
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Événement non trouvé'
            });
        }

        event.statut = statut;
        if (statut === 'rejete' && raisonRejet) {
            event.raisonRejet = raisonRejet;
        }
        
        if (statut === 'valide') {
            event.valideBy = req.user.id;
            event.dateValidation = new Date();
        }

        await event.save();

        // Mettre à jour les statistiques du club
        if (statut === 'valide') {
            await Club.findByIdAndUpdate(event.clubId._id, {
                $inc: { 'stats.nombreEventsValides': 1 }
            });
        }

        // Envoyer une notification par email au club
        try {
            let subject = '';
            let message = '';

            switch (statut) {
                case 'valide':
                    subject = 'Votre événement a été validé';
                    message = `Votre événement "${event.titre}" a été validé et sera publié.`;
                    break;
                case 'rejete':
                    subject = 'Votre événement a été rejeté';
                    message = `Votre événement "${event.titre}" a été rejeté. Raison: ${raisonRejet || 'Non spécifiée'}`;
                    break;
                case 'annule':
                    subject = 'Votre événement a été annulé';
                    message = `Votre événement "${event.titre}" a été annulé.`;
                    break;
            }

            if (subject && event.clubId.email) {
                await sendMail(event.clubId.email, subject, message);
            }
        } catch (emailErr) {
            console.error('Erreur envoi email:', emailErr);
        }

        res.json({
            success: true,
            message: `Statut de l'événement mis à jour: ${statut}`,
            event: {
                id: event._id,
                titre: event.titre,
                statut: event.statut,
                club: event.clubId.nom
            }
        });

    } catch (err) {
        console.error('Erreur updateEventStatus:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du statut'
        });
    }
};

// Récupérer les logs récents
exports.getRecentLogs = async (req, res) => {
    try {
        // Récupérer les logs récents (50 derniers)
        const logs = await Log.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        // Récupérer les vraies informations des utilisateurs avec cache
        const User = require('../models/User');
        const Admin = require('../models/Admin');
        const Club = require('../models/Club');

        // Cache pour éviter les requêtes répétées
        const userCache = new Map();
        const notFoundCache = new Set();

        const transformedLogs = await Promise.all(logs.map(async (log) => {
            let utilisateur = {
                nom: log.userType === 'Club' ? 'Club' : 'Utilisateur',
                prenom: log.userType === 'Club' ? 'Supprimé' : 'Supprimé',
                email: 'utilisateur-supprime@esprit.tn'
            };

            try {
                if (log.userId) {
                    const cacheKey = `${log.userType}-${log.userId}`;
                    
                    // Vérifier le cache
                    if (userCache.has(cacheKey)) {
                        utilisateur = userCache.get(cacheKey);
                    } else if (notFoundCache.has(cacheKey)) {
                        // Utilisateur déjà marqué comme non trouvé, utiliser les données par défaut
                        utilisateur = {
                            nom: log.userType === 'Club' ? 'Club' : 'Utilisateur',
                            prenom: log.userType === 'Club' ? 'Supprimé' : 'Supprimé',
                            email: 'utilisateur-supprime@esprit.tn'
                        };
                    } else {
                        let userData = null;
                        
                        switch (log.userType) {
                            case 'Admin':
                                userData = await Admin.findById(log.userId).select('nom prenom email').lean();
                                if (userData) {
                                    utilisateur = {
                                        nom: userData.nom || 'Admin',
                                        prenom: userData.prenom || 'Système',
                                        email: userData.email || 'admin@esprit.tn'
                                    };
                                    userCache.set(cacheKey, utilisateur);
                                } else {
                                    notFoundCache.add(cacheKey);
                                    utilisateur = {
                                        nom: 'Admin',
                                        prenom: 'Supprimé',
                                        email: 'admin-supprime@esprit.tn'
                                    };
                                }
                                break;
                            case 'Club':
                                userData = await Club.findById(log.userId).select('nom email').lean();
                                if (userData) {
                                    utilisateur = {
                                        nom: userData.nom || 'Club',
                                        prenom: 'Club',
                                        email: userData.email || 'club@esprit.tn'
                                    };
                                    userCache.set(cacheKey, utilisateur);
                                } else {
                                    notFoundCache.add(cacheKey);
                                    utilisateur = {
                                        nom: 'Club',
                                        prenom: 'Supprimé',
                                        email: 'club-supprime@esprit.tn'
                                    };
                                }
                                break;
                            case 'User':
                                userData = await User.findById(log.userId).select('nom prenom email').lean();
                                if (userData) {
                                    utilisateur = {
                                        nom: userData.nom || 'Utilisateur',
                                        prenom: userData.prenom || 'Inconnu',
                                        email: userData.email || 'user@esprit.tn'
                                    };
                                    userCache.set(cacheKey, utilisateur);
                                } else {
                                    notFoundCache.add(cacheKey);
                                    utilisateur = {
                                        nom: 'Utilisateur',
                                        prenom: 'Supprimé',
                                        email: 'user-supprime@esprit.tn'
                                    };
                                }
                                break;
                            // Gérer aussi les anciens logs avec le type en minuscule
                            case 'admin':
                                userData = await Admin.findById(log.userId).select('nom prenom email').lean();
                                if (userData) {
                                    utilisateur = {
                                        nom: userData.nom || 'Admin',
                                        prenom: userData.prenom || 'Système',
                                        email: userData.email || 'admin@esprit.tn'
                                    };
                                    userCache.set(cacheKey, utilisateur);
                                } else {
                                    notFoundCache.add(cacheKey);
                                    utilisateur = {
                                        nom: 'Admin',
                                        prenom: 'Supprimé',
                                        email: 'admin-supprime@esprit.tn'
                                    };
                                }
                                break;
                        }
                    }
                }
            } catch (error) {
                // En cas d'erreur, utiliser les données par défaut
                console.error(`Erreur lors de la récupération de l'utilisateur ${log.userId}:`, error.message);
            }

            return {
                ...log,
                user: utilisateur
            };
        }));

        res.json({
            success: true,
            data: transformedLogs
        });

    } catch (err) {
        console.error('Erreur getRecentLogs:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des logs'
        });
    }
};

// Obtenir tous les logs avec pagination et filtres
exports.getAllLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            action,
            dateFrom,
            dateTo,
            userId
        } = req.query;

        // Construction du filtre
        const filter = {};
        
        if (action) {
            filter.action = action;
        }
        
        if (userId) {
            filter.userId = userId;
        }
        
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) {
                filter.createdAt.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                filter.createdAt.$lte = new Date(dateTo);
            }
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Requête avec pagination et populate conditionnel
        const [logs, totalCount] = await Promise.all([
            Log.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Log.countDocuments(filter)
        ]);

        // Récupérer les vraies informations des utilisateurs
        const User = require('../models/User');
        const Admin = require('../models/Admin');
        const Club = require('../models/Club');

        // Cache pour éviter les requêtes répétées
        const userCache = new Map();
        const notFoundCache = new Set();

        const transformedLogs = await Promise.all(logs.map(async (log) => {
            let utilisateur = {
                nom: log.userType === 'Club' ? 'Club' : 'Utilisateur',
                prenom: log.userType === 'Club' ? 'Supprimé' : 'Supprimé',
                email: 'utilisateur-supprime@esprit.tn'
            };

            try {
                if (log.userId) {
                    const cacheKey = `${log.userType}-${log.userId}`;
                    
                    // Vérifier le cache
                    if (userCache.has(cacheKey)) {
                        utilisateur = userCache.get(cacheKey);
                    } else if (notFoundCache.has(cacheKey)) {
                        // Utilisateur déjà marqué comme non trouvé, utiliser les données par défaut
                        utilisateur = {
                            nom: log.userType === 'Club' ? 'Club' : 'Utilisateur',
                            prenom: log.userType === 'Club' ? 'Supprimé' : 'Supprimé',
                            email: 'utilisateur-supprime@esprit.tn'
                        };
                    } else {
                        let userData = null;
                        
                        switch (log.userType) {
                            case 'Admin':
                                userData = await Admin.findById(log.userId).select('nom prenom email').lean();
                                if (userData) {
                                    utilisateur = {
                                        nom: userData.nom || 'Admin',
                                        prenom: userData.prenom || 'Système',
                                        email: userData.email || 'admin@esprit.tn'
                                    };
                                    userCache.set(cacheKey, utilisateur);
                                } else {
                                    notFoundCache.add(cacheKey);
                                    utilisateur = {
                                        nom: 'Admin',
                                        prenom: 'Supprimé',
                                        email: 'admin-supprime@esprit.tn'
                                    };
                                }
                                break;
                            case 'Club':
                                userData = await Club.findById(log.userId).select('nom email').lean();
                                if (userData) {
                                    utilisateur = {
                                        nom: userData.nom || 'Club',
                                        prenom: 'Club',
                                        email: userData.email || 'club@esprit.tn'
                                    };
                                    userCache.set(cacheKey, utilisateur);
                                } else {
                                    notFoundCache.add(cacheKey);
                                    utilisateur = {
                                        nom: 'Club',
                                        prenom: 'Supprimé',
                                        email: 'club-supprime@esprit.tn'
                                    };
                                }
                                break;
                            case 'User':
                                userData = await User.findById(log.userId).select('nom prenom email').lean();
                                if (userData) {
                                    utilisateur = {
                                        nom: userData.nom || 'Utilisateur',
                                        prenom: userData.prenom || 'Inconnu',
                                        email: userData.email || 'user@esprit.tn'
                                    };
                                    userCache.set(cacheKey, utilisateur);
                                } else {
                                    notFoundCache.add(cacheKey);
                                    utilisateur = {
                                        nom: 'Utilisateur',
                                        prenom: 'Supprimé',
                                        email: 'user-supprime@esprit.tn'
                                    };
                                }
                                break;
                            // Gérer aussi les anciens logs avec le type en minuscule
                            case 'admin':
                                userData = await Admin.findById(log.userId).select('nom prenom email').lean();
                                if (userData) {
                                    utilisateur = {
                                        nom: userData.nom || 'Admin',
                                        prenom: userData.prenom || 'Système',
                                        email: userData.email || 'admin@esprit.tn'
                                    };
                                    userCache.set(cacheKey, utilisateur);
                                } else {
                                    notFoundCache.add(cacheKey);
                                    utilisateur = {
                                        nom: 'Admin',
                                        prenom: 'Supprimé',
                                        email: 'admin-supprime@esprit.tn'
                                    };
                                }
                                break;
                        }
                    }
                }
            } catch (error) {
                console.warn('Erreur lors de la récupération des données utilisateur:', error);
            }

            return {
                ...log,
                utilisateur
            };
        }));

        res.json({
            success: true,
            data: {
                logs: transformedLogs,
                totalCount,
                totalPages: Math.ceil(totalCount / limitNum),
                currentPage: pageNum,
                hasNext: pageNum < Math.ceil(totalCount / limitNum),
                hasPrevious: pageNum > 1
            }
        });

    } catch (err) {
        console.error('Erreur getAllLogs:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des logs'
        });
    }
};

// Obtenir les statistiques des logs pour debug
exports.getLogsStats = async (req, res) => {
    try {
        // Compter les logs par action
        const actionStats = await Log.aggregate([
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Compter les logs par type d'utilisateur
        const userTypeStats = await Log.aggregate([
            {
                $group: {
                    _id: '$userType',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Total des logs
        const totalLogs = await Log.countDocuments();

        res.json({
            success: true,
            data: {
                totalLogs,
                actionStats,
                userTypeStats
            }
        });

    } catch (err) {
        console.error('Erreur getLogsStats:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques des logs'
        });
    }
};

// Créer des logs de test pour diversifier les données
exports.createTestLogs = async (req, res) => {
    try {
        const Logger = require('../utils/logger');
        const User = require('../models/User');
        const Club = require('../models/Club');
        
        // Récupérer l'admin actuel
        const adminId = req.user.id;
        
        // Créer quelques logs de test diversifiés
        const testLogs = [
            {
                action: 'create_club',
                description: 'Création d\'un nouveau club de test',
                targetType: 'Club'
            },
            {
                action: 'update_club',
                description: 'Modification des informations du club',
                targetType: 'Club'
            },
            {
                action: 'approve_club',
                description: 'Approbation d\'un club en attente',
                targetType: 'Club'
            },
            {
                action: 'create_event',
                description: 'Création d\'un nouvel événement',
                targetType: 'Event'
            },
            {
                action: 'approve_event',
                description: 'Approbation d\'un événement',
                targetType: 'Event'
            },
            {
                action: 'reject_event',
                description: 'Rejet d\'un événement',
                targetType: 'Event'
            },
            {
                action: 'create_user',
                description: 'Création d\'un nouvel utilisateur',
                targetType: 'User'
            },
            {
                action: 'update_user',
                description: 'Modification d\'un utilisateur',
                targetType: 'User'
            },
            {
                action: 'delete_user',
                description: 'Suppression d\'un utilisateur',
                targetType: 'User'
            },
            {
                action: 'logout',
                description: 'Déconnexion',
                targetType: 'system'
            }
        ];

        // Créer les logs de test
        for (const logData of testLogs) {
            await Logger.logAdminAction(
                adminId,
                logData.action,
                logData.description,
                logData.targetType,
                null,
                {
                    ipAddress: '127.0.0.1',
                    userAgent: 'Test Agent',
                    timestamp: new Date(),
                    note: 'Log créé pour test'
                }
            );
        }

        res.json({
            success: true,
            message: `${testLogs.length} logs de test créés avec succès`
        });

    } catch (err) {
        console.error('Erreur createTestLogs:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création des logs de test'
        });
    }
};

// Supprimer les logs de test
exports.deleteTestLogs = async (req, res) => {
    try {
        // Supprimer tous les logs qui contiennent "Log créé pour test" dans les détails
        const result = await Log.deleteMany({
            'details.note': 'Log créé pour test'
        });

        res.json({
            success: true,
            message: `${result.deletedCount} logs de test supprimés avec succès`
        });

    } catch (err) {
        console.error('Erreur deleteTestLogs:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression des logs de test'
        });
    }
};

// Nettoyer les logs orphelins (logs pointant vers des utilisateurs supprimés)
exports.cleanOrphanLogs = async (req, res) => {
    try {
        const User = require('../models/User');
        const Admin = require('../models/Admin');
        const Club = require('../models/Club');

        // Récupérer tous les logs avec userId
        const logs = await Log.find({ userId: { $exists: true, $ne: null } }).lean();
        
        let orphanLogs = [];
        
        for (const log of logs) {
            let userExists = false;
            
            try {
                switch (log.userType) {
                    case 'Admin':
                    case 'admin':
                        userExists = await Admin.exists({ _id: log.userId });
                        break;
                    case 'Club':
                        userExists = await Club.exists({ _id: log.userId });
                        break;
                    case 'User':
                        userExists = await User.exists({ _id: log.userId });
                        break;
                }
            } catch (error) {
                // Si erreur (ex: ObjectId invalide), considérer comme orphelin
                userExists = false;
            }
            
            if (!userExists) {
                orphanLogs.push(log._id);
            }
        }

        // Supprimer les logs orphelins
        let deletedCount = 0;
        if (orphanLogs.length > 0) {
            const result = await Log.deleteMany({ _id: { $in: orphanLogs } });
            deletedCount = result.deletedCount;
        }

        res.json({
            success: true,
            message: `${deletedCount} logs orphelins supprimés avec succès`,
            details: {
                totalLogsChecked: logs.length,
                orphanLogsFound: orphanLogs.length,
                orphanLogsDeleted: deletedCount
            }
        });

    } catch (err) {
        console.error('Erreur cleanOrphanLogs:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du nettoyage des logs orphelins'
        });
    }
};
