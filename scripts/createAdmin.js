const bcrypt = require('bcrypt');
const User = require('../models/User');
const { connectDB } = require('../config/db');

/**
 * Crée automatiquement un admin par défaut si aucun admin n'existe
 */
const createDefaultAdmin = async () => {
    try {
        console.log('🔍 Vérification de l\'existence d\'un admin...');
        
        // Vérifier si un admin existe déjà
        const existingAdmin = await User.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('✅ Un admin existe déjà:', existingAdmin.email);
            return existingAdmin;
        }

        console.log('⚠️ Aucun admin trouvé. Création d\'un admin par défaut...');

        // Données par défaut pour l'admin
        const defaultAdminData = {
            nom: 'Administrateur',
            prenom: 'Système',
            email: 'admin@esprit.tn',
            password: 'Admin123!', // Mot de passe temporaire
            role: 'admin',
            permissions: ['manage_users', 'create_club', 'edit_club', 'delete_club', 'validate_event'],
            statut: 'actif',
            isFirstLogin: true // Force à changer le mot de passe
        };

        // Hasher le mot de passe
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(defaultAdminData.password, saltRounds);

        // Créer l'admin
        const admin = new User({
            ...defaultAdminData,
            password: hashedPassword
        });

        await admin.save();

        console.log('✅ Admin par défaut créé avec succès!');
        console.log('📧 Email:', defaultAdminData.email);
        console.log('🔑 Mot de passe temporaire:', defaultAdminData.password);
        console.log('⚠️ IMPORTANT: Changez ce mot de passe lors de la première connexion!');

        return admin;

    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'admin par défaut:', error);
        throw error;
    }
};

/**
 * Crée plusieurs admins pour différents environnements
 */
const createMultipleAdmins = async () => {
    try {
        const admins = [
            {
                nom: 'Administrateur',
                prenom: 'Principal',
                email: 'admin@esprit.tn',
                password: 'Admin123!',
                role: 'admin',
                permissions: ['manage_users', 'create_club', 'edit_club', 'delete_club', 'validate_event'],
                statut: 'actif',
                isFirstLogin: true
            },
            {
                nom: 'Administrateur',
                prenom: 'Technique',
                email: 'tech@esprit.tn',
                password: 'Tech123!',
                role: 'admin',
                permissions: ['manage_users', 'create_club', 'edit_club', 'delete_club', 'validate_event'],
                statut: 'actif',
                isFirstLogin: true
            },
            {
                nom: 'Responsable',
                prenom: 'Étudiants',
                email: 'student.admin@esprit.tn',
                password: 'Student123!',
                role: 'admin',
                permissions: ['manage_users', 'create_club', 'edit_club', 'delete_club', 'validate_event'],
                statut: 'actif',
                isFirstLogin: true
            }
        ];

        const createdAdmins = [];

        for (const adminData of admins) {
            // Vérifier si l'admin existe déjà
            const existingAdmin = await User.findOne({ email: adminData.email });
            
            if (existingAdmin) {
                console.log(`⏭️ Admin ${adminData.email} existe déjà`);
                continue;
            }

            // Hasher le mot de passe
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

            // Créer l'admin
            const admin = new User({
                ...adminData,
                password: hashedPassword
            });

            await admin.save();
            createdAdmins.push(admin);

            console.log(`✅ Admin créé: ${adminData.email} (${adminData.password})`);
        }

        if (createdAdmins.length > 0) {
            console.log(`🎉 ${createdAdmins.length} admin(s) créé(s) avec succès!`);
        } else {
            console.log('📋 Tous les admins existent déjà');
        }

        return createdAdmins;

    } catch (error) {
        console.error('❌ Erreur lors de la création des admins:', error);
        throw error;
    }
};

/**
 * Réinitialise le mot de passe d'un admin
 */
const resetAdminPassword = async (email, newPassword = 'NewAdmin123!') => {
    try {
        const admin = await User.findOne({ email, role: 'admin' });
        
        if (!admin) {
            throw new Error(`Admin avec l'email ${email} non trouvé`);
        }

        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        admin.password = hashedPassword;
        admin.isFirstLogin = true; // Force à changer le mot de passe
        await admin.save();

        console.log(`✅ Mot de passe réinitialisé pour ${email}`);
        console.log(`🔑 Nouveau mot de passe: ${newPassword}`);

        return admin;

    } catch (error) {
        console.error('❌ Erreur lors de la réinitialisation:', error);
        throw error;
    }
};

/**
 * Liste tous les admins
 */
const listAdmins = async () => {
    try {
        const admins = await User.find({ role: 'admin' })
            .select('nom prenom email isActive createdAt')
            .sort({ createdAt: -1 });

        console.log('👥 Liste des administrateurs:');
        admins.forEach((admin, index) => {
            console.log(`${index + 1}. ${admin.prenom} ${admin.nom} (${admin.email}) - ${admin.isActive ? 'Actif' : 'Inactif'}`);
        });

        return admins;

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des admins:', error);
        throw error;
    }
};

module.exports = {
    createDefaultAdmin,
    createMultipleAdmins,
    resetAdminPassword,
    listAdmins
};