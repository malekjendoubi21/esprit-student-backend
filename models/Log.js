const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'userType',
        required: true
    },
    userType: {
        type: String,
        required: true,
        enum: ['Admin', 'Club', 'User'] // Utiliser les noms exacts des modèles avec majuscules
    },
    action: {
        type: String,
        required: true,
        enum: [
            // Actions d'authentification
            'login', 'logout', 'password_change',
            
            // Actions admin
            'create_club', 'update_club', 'delete_club', 'approve_club', 'reject_club',
            'create_user', 'update_user', 'delete_user',
            'approve_event', 'reject_event',
            
            // Actions club
            'create_event', 'update_event', 'delete_event',
            'update_profile', 'complete_first_login',
            
            // Actions système
            'system_backup', 'system_maintenance'
        ]
    },
    description: {
        type: String,
        required: true
    },
    targetType: {
        type: String,
        enum: ['Club', 'Event', 'User', 'Admin', 'system']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetType'
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true // Ajoute automatiquement createdAt et updatedAt
});

// Index pour optimiser les requêtes
logSchema.index({ createdAt: -1 }); // Pour trier par date
logSchema.index({ userId: 1, action: 1 }); // Pour filtrer par utilisateur et action
logSchema.index({ targetType: 1, targetId: 1 }); // Pour filtrer par cible

// Méthode statique pour créer un log facilement
logSchema.statics.createLog = async function(logData) {
    try {
        const log = new this(logData);
        await log.save();
        return log;
    } catch (error) {
        console.error('Erreur lors de la création du log:', error);
        throw error;
    }
};

// Méthode statique pour obtenir les logs récents avec populate manuel
logSchema.statics.getRecentLogsWithDetails = async function(limit = 50) {
    try {
        const logs = await this.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        // Populate manuel pour éviter les erreurs de modèle
        const Admin = require('./Admin');
        const User = require('./User');
        const Club = require('./Club');
        const Event = require('./Event');

        for (let log of logs) {
            // Populate userId selon le userType
            if (log.userId) {
                try {
                    switch (log.userType) {
                        case 'Admin':
                            const admin = await Admin.findById(log.userId).select('nom prenom email').lean();
                            if (admin) log.user = admin;
                            break;
                        case 'User':
                            const user = await User.findById(log.userId).select('nom prenom email').lean();
                            if (user) log.user = user;
                            break;
                        case 'Club':
                            const club = await Club.findById(log.userId).select('nom email').lean();
                            if (club) log.user = { nom: club.nom, email: club.email };
                            break;
                    }
                } catch (err) {
                    // Si l'utilisateur n'existe plus, on continue
                    console.log(`Utilisateur ${log.userId} non trouvé pour le log ${log._id}`);
                }
            }

            // Populate targetId selon le targetType
            if (log.targetId && log.targetType && log.targetType !== 'system') {
                try {
                    switch (log.targetType) {
                        case 'Club':
                            const targetClub = await Club.findById(log.targetId).select('nom').lean();
                            if (targetClub) log.target = targetClub;
                            break;
                        case 'Event':
                            const targetEvent = await Event.findById(log.targetId).select('titre').lean();
                            if (targetEvent) log.target = targetEvent;
                            break;
                        case 'User':
                            const targetUser = await User.findById(log.targetId).select('nom prenom').lean();
                            if (targetUser) log.target = targetUser;
                            break;
                        case 'Admin':
                            const targetAdmin = await Admin.findById(log.targetId).select('nom prenom').lean();
                            if (targetAdmin) log.target = targetAdmin;
                            break;
                    }
                } catch (err) {
                    // Si la cible n'existe plus, on continue
                    console.log(`Cible ${log.targetId} non trouvée pour le log ${log._id}`);
                }
            }
        }

        return logs;
    } catch (error) {
        console.error('Erreur lors de la récupération des logs avec détails:', error);
        throw error;
    }
};

// Méthode statique pour obtenir les logs par utilisateur
logSchema.statics.getLogsByUser = async function(userId, limit = 20) {
    try {
        return await this.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('targetId');
    } catch (error) {
        console.error('Erreur lors de la récupération des logs utilisateur:', error);
        throw error;
    }
};

// Méthode statique pour obtenir les logs par action
logSchema.statics.getLogsByAction = async function(action, limit = 20) {
    try {
        return await this.find({ action })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'nom prenom email')
            .populate('targetId');
    } catch (error) {
        console.error('Erreur lors de la récupération des logs par action:', error);
        throw error;
    }
};

module.exports = mongoose.model('Log', logSchema);
