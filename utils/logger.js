const Log = require('../models/Log');

/**
 * Utilitaire pour créer des logs facilement
 */
class Logger {
    
    /**
     * Convertir le userType en nom de modèle Mongoose
     */
    static getModelName(userType) {
        const mapping = {
            'admin': 'Admin',
            'club': 'Club', 
            'user': 'User'
        };
        return mapping[userType] || 'User';
    }

    /**
     * Créer un log d'authentification
     */
    static async logAuth(userId, userType, action, description, details = {}) {
        try {
            await Log.createLog({
                userId,
                userType: this.getModelName(userType),
                action,
                description,
                targetType: 'system',
                details
            });
        } catch (error) {
            console.error('Erreur lors de la création du log d\'authentification:', error);
        }
    }

    /**
     * Créer un log d'action admin
     */
    static async logAdminAction(adminId, action, description, targetType, targetId, details = {}) {
        try {
            await Log.createLog({
                userId: adminId,
                userType: 'Admin',
                action,
                description,
                targetType,
                targetId,
                details
            });
        } catch (error) {
            console.error('Erreur lors de la création du log admin:', error);
        }
    }

    /**
     * Créer un log d'action club
     */
    static async logClubAction(clubId, action, description, targetType, targetId, details = {}) {
        try {
            await Log.createLog({
                userId: clubId,
                userType: 'Club',
                action,
                description,
                targetType,
                targetId,
                details
            });
        } catch (error) {
            console.error('Erreur lors de la création du log club:', error);
        }
    }

    /**
     * Créer un log d'action utilisateur
     */
    static async logUserAction(userId, action, description, targetType, targetId, details = {}) {
        try {
            await Log.createLog({
                userId,
                userType: 'User',
                action,
                description,
                targetType,
                targetId,
                details
            });
        } catch (error) {
            console.error('Erreur lors de la création du log utilisateur:', error);
        }
    }

    /**
     * Log de connexion
     */
    static async logLogin(userId, userType, ipAddress, userAgent) {
        await this.logAuth(userId, userType, 'login', `Connexion réussie`, {
            ipAddress,
            userAgent,
            timestamp: new Date()
        });
    }

    /**
     * Log de déconnexion
     */
    static async logLogout(userId, userType) {
        await this.logAuth(userId, userType, 'logout', `Déconnexion`, {
            timestamp: new Date()
        });
    }

    /**
     * Log de création de club
     */
    static async logClubCreation(adminId, clubId, clubName) {
        await this.logAdminAction(
            adminId,
            'create_club',
            `Création du club: ${clubName}`,
            'Club',
            clubId,
            { clubName }
        );
    }

    /**
     * Log d'approbation/rejet de club
     */
    static async logClubStatusUpdate(adminId, clubId, clubName, newStatus, reason = '') {
        const action = newStatus === 'actif' ? 'approve_club' : 'reject_club';
        const description = `${newStatus === 'actif' ? 'Approbation' : 'Rejet'} du club: ${clubName}`;
        
        await this.logAdminAction(
            adminId,
            action,
            description,
            'Club',
            clubId,
            { clubName, newStatus, reason }
        );
    }

    /**
     * Log d'approbation/rejet d'événement
     */
    static async logEventStatusUpdate(adminId, eventId, eventTitle, newStatus, reason = '') {
        const action = newStatus === 'valide' ? 'approve_event' : 'reject_event';
        const description = `${newStatus === 'valide' ? 'Approbation' : 'Rejet'} de l'événement: ${eventTitle}`;
        
        await this.logAdminAction(
            adminId,
            action,
            description,
            'Event',
            eventId,
            { eventTitle, newStatus, reason }
        );
    }

    /**
     * Log de création d'événement
     */
    static async logEventCreation(clubId, eventId, eventTitle) {
        await this.logClubAction(
            clubId,
            'create_event',
            `Création de l'événement: ${eventTitle}`,
            'Event',
            eventId,
            { eventTitle }
        );
    }

    /**
     * Log de mise à jour de profil
     */
    static async logProfileUpdate(userId, userType, changes) {
        const modelName = this.getModelName(userType);
        await this.logUserAction(
            userId,
            'update_profile',
            'Mise à jour du profil',
            modelName,
            userId,
            { changes }
        );
    }
}

module.exports = Logger;