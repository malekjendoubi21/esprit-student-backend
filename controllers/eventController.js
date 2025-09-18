const Event = require('../models/Event');
const Club = require('../models/Club');
const { sendMail } = require('../utils/mailService');
const { ObjectId } = require('mongoose').Types;

// Obtenir tous les événements avec pagination et filtres
exports.getEvents = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            statut,
            typeEvent,
            clubId,
            search,
            dateDebut,
            dateFin
        } = req.query;

        // Construire le filtre
        const filter = {};
        if (statut) filter.statut = statut;
        if (typeEvent) filter.typeEvent = typeEvent;
        if (clubId) filter.clubId = clubId;
        
        // Debug log to trace the filter being applied
        console.log('Admin/Club events filter:', filter);
        
        // Filtre de recherche textuelle
        if (search) {
            filter.$or = [
                { titre: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { lieu: { $regex: search, $options: 'i' } }
            ];
        }

        // Filtre par dates
        if (dateDebut || dateFin) {
            filter.dateDebut = {};
            if (dateDebut) filter.dateDebut.$gte = new Date(dateDebut);
            if (dateFin) filter.dateDebut.$lte = new Date(dateFin);
        }

        // Si c'est un club, ne montrer que ses événements
        if (req.user.userType === 'club') {
            const clubId = ObjectId.isValid(req.user.id) 
                ? new ObjectId(req.user.id)
                : req.user.id;
            filter.clubId = clubId;
        }

        // Calculer pagination
        const skip = (page - 1) * limit;

        // Exécuter la requête
        const events = await Event.find(filter)
            .populate('clubId', 'nom email categorie')
            .populate('valideBy', 'nom prenom')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Event.countDocuments(filter);
        
        console.log(`Found ${events.length} events for admin/club view`);

        res.json({
            success: true,
            data: {
                events,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: events.length,
                    totalItems: total
                }
            }
        });

    } catch (err) {
        console.error('Erreur getEvents:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des événements'
        });
    }
};

// Obtenir tous les événements publiquement (sans authentification)
exports.getPublicEvents = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            type = 'upcoming',
            search
        } = req.query;

        // Construire le filtre - seulement les événements validés
        const filter = {
            statut: 'valide'  // Changed from valide: true to match the schema
        };

        // Debug log to trace the filter being applied
        console.log('Public events filter:', filter, 'Type:', type);

        // Filtre par type (upcoming/past)
        const now = new Date();
        if (type === 'upcoming') {
            filter.dateDebut = { $gte: now };
        } else if (type === 'past') {
            filter.dateDebut = { $lt: now }; // Changed from dateFin to dateDebut for consistency
        }
        
        console.log('Date filter applied:', type, filter.dateDebut);
        
        // Filtre de recherche textuelle
        if (search) {
            filter.$or = [
                { titre: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { lieu: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculer pagination
        const skip = (page - 1) * limit;

        // Exécuter la requête avec tri approprié
        const sortField = type === 'upcoming' ? { dateDebut: 1 } : { dateDebut: -1 };
        
        const events = await Event.find(filter)
            .populate('clubId', 'nom logo')
            .sort(sortField)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Event.countDocuments(filter);
        
        console.log(`Found ${events.length} public events for type ${type}`);

        res.json({
            success: true,
            data: {
                events,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: events.length,
                    totalItems: total
                }
            }
        });

    } catch (err) {
        console.error('Erreur getPublicEvents:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des événements publics'
        });
    }
};

// Obtenir un événement par ID
exports.getEventById = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findById(id)
            .populate('clubId', 'nom email categorie contact')
            .populate('valideBy', 'nom prenom email');

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Événement non trouvé'
            });
        }

        // Vérifier les permissions
        if (req.user.userType === 'club' && event.clubId._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé'
            });
        }

        res.json({
            success: true,
            data: event
        });

    } catch (err) {
        console.error('Erreur getEventById:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'événement'
        });
    }
};

// Créer un nouvel événement
exports.createEvent = async (req, res) => {
    try {
        const clubId = req.user.userType === 'club' 
            ? (ObjectId.isValid(req.user.id) 
                ? new ObjectId(req.user.id)
                : req.user.id)
            : req.body.clubId;

        // Vérifications
        const {
            titre,
            description,
            dateDebut,
            dateFin,
            lieu,
            typeEvent
        } = req.body;

        if (!titre || !description || !dateDebut || !dateFin || !lieu || !typeEvent) {
            return res.status(400).json({
                success: false,
                message: 'Titre, description, dates, lieu et type d\'événement sont requis'
            });
        }

        // Vérifier que le club existe et est actif
        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        if (club.statut !== 'actif') {
            return res.status(403).json({
                success: false,
                message: 'Le club doit être actif pour créer des événements'
            });
        }

        // Créer l'événement
        const eventData = {
            ...req.body,
            clubId,
            statut: 'en_attente'
        };

        const event = new Event(eventData);
        await event.save();

        // Mettre à jour les statistiques du club
        await Club.findByIdAndUpdate(clubId, {
            $inc: { 'stats.nombreEvents': 1 },
            $set: { 'stats.derniereActivite': new Date() }
        });

        // Populer les données pour la réponse
        const populatedEvent = await Event.findById(event._id)
            .populate('clubId', 'nom email');

        res.status(201).json({
            success: true,
            message: 'Événement créé et en attente de validation',
            data: populatedEvent
        });

    } catch (err) {
        console.error('Erreur createEvent:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de l\'événement'
        });
    }
};

// Mettre à jour un événement
exports.updateEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findById(id).populate('clubId', 'nom email');
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Événement non trouvé'
            });
        }

        // Vérifier les permissions
        if (req.user.userType === 'club' && event.clubId._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez modifier que vos propres événements'
            });
        }

        // Vérifier si l'événement peut être modifié
        if (!event.peutEtreModifie()) {
            return res.status(403).json({
                success: false,
                message: 'Cet événement ne peut plus être modifié'
            });
        }

        // Champs autorisés à être modifiés
        const allowedFields = [
            'titre', 'description', 'dateDebut', 'dateFin', 'heureDebut', 'heureFin',
            'lieu', 'adresse', 'capaciteMax', 'typeEvent', 'public', 'gratuit', 'prix',
            'lienFormulaire', 'lienMeet', 'contact', 'medias', 'tags'
        ];

        // Mettre à jour seulement les champs autorisés
        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) {
                if (key === 'contact' && event.contact) {
                    event.contact = { ...event.contact.toObject(), ...req.body[key] };
                } else if (key === 'medias' && event.medias) {
                    event.medias = { ...event.medias.toObject(), ...req.body[key] };
                } else {
                    event[key] = req.body[key];
                }
            }
        });

        // Si l'événement était rejeté, le remettre en attente
        if (event.statut === 'rejete') {
            event.statut = 'en_attente';
            event.raisonRejet = undefined;
        }

        await event.save();

        const updatedEvent = await Event.findById(id)
            .populate('clubId', 'nom email')
            .populate('valideBy', 'nom prenom');

        res.json({
            success: true,
            message: 'Événement mis à jour avec succès',
            data: updatedEvent
        });

    } catch (err) {
        console.error('Erreur updateEvent:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour de l\'événement'
        });
    }
};

// Supprimer un événement
exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Événement non trouvé'
            });
        }

        // Vérifier les permissions
        if (req.user.userType === 'club' && event.clubId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez supprimer que vos propres événements'
            });
        }

        // Vérifier si l'événement peut être supprimé
        if (event.statut === 'valide' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Un événement validé ne peut être supprimé que par un admin'
            });
        }

        await Event.findByIdAndDelete(id);

        // Mettre à jour les statistiques du club
        await Club.findByIdAndUpdate(event.clubId, {
            $inc: { 
                'stats.nombreEvents': -1,
                'stats.nombreEventsValides': event.statut === 'valide' ? -1 : 0
            }
        });

        res.json({
            success: true,
            message: 'Événement supprimé avec succès'
        });

    } catch (err) {
        console.error('Erreur deleteEvent:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de l\'événement'
        });
    }
};

// Valider un événement (Admin uniquement)
exports.validateEvent = async (req, res) => {
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
                    message = `Félicitations ! Votre événement "${event.titre}" a été validé et sera publié.`;
                    break;
                case 'rejete':
                    subject = 'Votre événement a été rejeté';
                    message = `Votre événement "${event.titre}" a été rejeté.\nRaison: ${raisonRejet || 'Non spécifiée'}\n\nVous pouvez le modifier et le soumettre à nouveau.`;
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

        const updatedEvent = await Event.findById(id)
            .populate('clubId', 'nom email')
            .populate('valideBy', 'nom prenom');

        res.json({
            success: true,
            message: `Événement ${statut}`,
            data: updatedEvent
        });

    } catch (err) {
        console.error('Erreur validateEvent:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la validation de l\'événement'
        });
    }
};

// Obtenir les événements du club connecté
exports.getMyEvents = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            statut,
            typeEvent,
            search
        } = req.query;

        // Construire le filtre pour le club connecté
        const clubId = ObjectId.isValid(req.user.id) 
            ? new ObjectId(req.user.id)
            : req.user.id;
        const filter = { clubId: clubId };
        if (statut) filter.statut = statut;
        if (typeEvent) filter.typeEvent = typeEvent;
        if (search) {
            filter.$or = [
                { titre: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculer pagination
        const skip = (page - 1) * limit;

        // Exécuter la requête
        const events = await Event.find(filter)
            .populate('valideBy', 'nom prenom')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Event.countDocuments(filter);

        // Statistiques rapides
        const stats = await Event.aggregate([
            { $match: { clubId: req.user.userData._id } },
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
                events,
                stats,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: events.length,
                    totalItems: total
                }
            }
        });

    } catch (err) {
        console.error('Erreur getMyEvents:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des événements'
        });
    }
};

// Obtenir les événements d'un club spécifique (route publique)
exports.getEventsByClub = async (req, res) => {
    try {
        const { clubId } = req.params;
        const {
            limit = 5,
            type = 'upcoming',
            statut = 'valide'  // Fixed: should match the enum in Event model
        } = req.query;

        // Vérifier que le club existe
        if (!ObjectId.isValid(clubId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de club invalide'
            });
        }

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        // Construire le filtre
        const filter = { 
            clubId: new ObjectId(clubId),
            statut: statut // Ne montrer que les événements validés par défaut
        };

        // Filtre par type (upcoming/past)
        const now = new Date();
        if (type === 'upcoming') {
            filter.dateDebut = { $gte: now };
        } else if (type === 'past') {
            filter.dateDebut = { $lt: now };
        }

        // Tri : événements à venir par date croissante, passés par date décroissante
        const sortOrder = type === 'upcoming' ? { dateDebut: 1 } : { dateDebut: -1 };

        // Exécuter la requête
        const events = await Event.find(filter)
            .populate('clubId', 'nom logo')
            .sort(sortOrder)
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            data: events
        });

    } catch (err) {
        console.error('Erreur getEventsByClub:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des événements du club'
        });
    }
};

// Obtenir les statistiques des événements
exports.getEventStats = async (req, res) => {
    try {
        const stats = await Promise.all([
            Event.countDocuments(),
            Event.countDocuments({ statut: 'valide' }),
            Event.countDocuments({ statut: 'en_attente' }),
            Event.countDocuments({ statut: 'rejete' }),
            Event.aggregate([
                { $group: { _id: '$typeEvent', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Event.aggregate([
                { $match: { statut: 'valide' } },
                { $group: { _id: '$public', count: { $sum: 1 } } }
            ])
        ]);

        const [
            totalEvents,
            validatedEvents,
            pendingEvents,
            rejectedEvents,
            eventsByType,
            eventsByPublic
        ] = stats;

        res.json({
            success: true,
            data: {
                total: totalEvents,
                validated: validatedEvents,
                pending: pendingEvents,
                rejected: rejectedEvents,
                byType: eventsByType,
                byPublic: eventsByPublic
            }
        });

    } catch (err) {
        console.error('Erreur getEventStats:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques'
        });
    }
};
