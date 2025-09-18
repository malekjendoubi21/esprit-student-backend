const Club = require('../models/Club');

// Vérifier si c'est la première connexion et retourner les infos nécessaires
exports.checkFirstLogin = async (req, res) => {
    try {
        const club = await Club.findById(req.user.id).select('-password');
        
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        const response = {
            success: true,
            data: {
                isFirstLogin: club.premiereConnexion,
                profileCompleted: club.profileComplet,
                club: {
                    id: club._id,
                    nom: club.nom,
                    email: club.email,
                    categorie: club.categorie,
                    statut: club.statut,
                    description: club.description,
                    membres: club.membres,
                    president: club.president,
                    fondation: club.fondation,
                    activites: club.activites,
                    reseauxSociaux: club.reseauxSociaux,
                    siteWeb: club.siteWeb,
                    contact: club.contact,
                    detailsComplets: club.detailsComplets,
                    images: club.images,
                    imageCouverture: club.imageCouverture
                }
            }
        };

        res.json(response);

    } catch (err) {
        console.error('Erreur checkFirstLogin:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification'
        });
    }
};

// Compléter le profil lors de la première connexion
exports.completeFirstLoginProfile = async (req, res) => {
    try {
        const club = await Club.findById(req.user.id);
        
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        if (!club.premiereConnexion) {
            return res.status(400).json({
                success: false,
                message: 'Ce n\'est pas votre première connexion'
            });
        }

        // Données obligatoires pour la première connexion
        const requiredFields = [
            'description',
            'president.nom',
            'president.prenom', 
            'president.email',
            'contact.telephone',
            'membres',
            'detailsComplets.presentation',
            'detailsComplets.objectifs'
        ];

        // Vérifier que tous les champs obligatoires sont présents
        const missingFields = [];
        requiredFields.forEach(field => {
            const keys = field.split('.');
            let value = req.body;
            
            for (let key of keys) {
                if (value && typeof value === 'object') {
                    value = value[key];
                } else {
                    value = undefined;
                    break;
                }
            }
            
            if (!value) {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Champs obligatoires manquants',
                missingFields
            });
        }

        // Mettre à jour le profil du club
        const allowedFields = [
            'description', 'membres', 'president', 'fondation',
            'activites', 'reseauxSociaux', 'siteWeb', 'contact', 'detailsComplets',
            'images', 'imageCouverture'
        ];

        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) {
                if (key === 'detailsComplets' && club.detailsComplets) {
                    club.detailsComplets = { ...club.detailsComplets.toObject(), ...req.body[key] };
                } else if (key === 'reseauxSociaux' && club.reseauxSociaux) {
                    club.reseauxSociaux = { ...club.reseauxSociaux.toObject(), ...req.body[key] };
                } else if (key === 'contact' && club.contact) {
                    club.contact = { ...club.contact.toObject(), ...req.body[key] };
                } else if (key === 'president' && club.president) {
                    club.president = { ...club.president.toObject(), ...req.body[key] };
                } else {
                    club[key] = req.body[key];
                }
            }
        });

        // Marquer la première connexion comme terminée
        club.premiereConnexion = false;
        
        // Le middleware pre('save') va automatiquement vérifier et mettre à jour profileComplet
        await club.save();

        // Retourner le club mis à jour
        const updatedClub = await Club.findById(club._id)
            .select('-password');

        res.json({
            success: true,
            message: 'Profil complété avec succès',
            data: {
                club: updatedClub,
                profileCompleted: updatedClub.profileComplet,
                isFirstLogin: false
            }
        });

    } catch (err) {
        console.error('Erreur completeFirstLoginProfile:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du profil'
        });
    }
};

// Obtenir le guide d'aide pour la première connexion
exports.getFirstLoginGuide = async (req, res) => {
    try {
        const guide = {
            success: true,
            data: {
                title: "Guide de première connexion",
                description: "Complétez votre profil de club pour commencer à créer des événements",
                steps: [
                    {
                        step: 1,
                        title: "Informations générales",
                        description: "Complétez la description de votre club et le nombre de membres",
                        fields: ["description", "membres"]
                    },
                    {
                        step: 2,
                        title: "Président du club",
                        description: "Renseignez les informations du président",
                        fields: ["president.nom", "president.prenom", "president.email", "president.telephone"]
                    },
                    {
                        step: 3,
                        title: "Contact",
                        description: "Ajoutez les informations de contact du club",
                        fields: ["contact.telephone", "contact.email", "contact.adresse"]
                    },
                    {
                        step: 4,
                        title: "Présentation détaillée",
                        description: "Rédigez une présentation complète de votre club",
                        fields: ["detailsComplets.presentation", "detailsComplets.objectifs"]
                    },
                    {
                        step: 5,
                        title: "Activités et médias",
                        description: "Listez vos activités et ajoutez des liens vers vos réseaux sociaux",
                        fields: ["activites", "reseauxSociaux", "siteWeb"]
                    }
                ],
                categories: [
                    "sportif", "culturel", "technologique", "social", "academique", "entrepreneurial", "autre"
                ],
                tips: [
                    "Une description claire attirera plus d'étudiants",
                    "N'oubliez pas d'ajouter vos réseaux sociaux",
                    "Les objectifs doivent être spécifiques et mesurables",
                    "Une photo de profil et une couverture amélioreront votre visibilité"
                ]
            }
        };

        res.json(guide);

    } catch (err) {
        console.error('Erreur getFirstLoginGuide:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du guide'
        });
    }
};

// Sauvegarder le profil partiellement (brouillon)
exports.saveDraftProfile = async (req, res) => {
    try {
        const club = await Club.findById(req.user.id);
        
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club non trouvé'
            });
        }

        // Mettre à jour seulement les champs fournis (pas de validation stricte)
        const allowedFields = [
            'description', 'membres', 'president', 'fondation',
            'activites', 'reseauxSociaux', 'siteWeb', 'contact', 'detailsComplets'
        ];

        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) {
                if (key === 'detailsComplets' && club.detailsComplets) {
                    club.detailsComplets = { ...club.detailsComplets.toObject(), ...req.body[key] };
                } else if (key === 'reseauxSociaux' && club.reseauxSociaux) {
                    club.reseauxSociaux = { ...club.reseauxSociaux.toObject(), ...req.body[key] };
                } else if (key === 'contact' && club.contact) {
                    club.contact = { ...club.contact.toObject(), ...req.body[key] };
                } else if (key === 'president' && club.president) {
                    club.president = { ...club.president.toObject(), ...req.body[key] };
                } else {
                    club[key] = req.body[key];
                }
            }
        });

        await club.save();

        res.json({
            success: true,
            message: 'Brouillon sauvegardé',
            data: {
                profileCompleted: club.profileComplet,
                isFirstLogin: club.premiereConnexion
            }
        });

    } catch (err) {
        console.error('Erreur saveDraftProfile:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la sauvegarde'
        });
    }
};