#!/usr/bin/env node

/**
 * Script CLI pour la gestion des administrateurs
 * Usage: node scripts/adminCLI.js [command] [options]
 */

const { connectDB, disconnectDB } = require('../config/db');
const {
    createDefaultAdmin,
    createMultipleAdmins,
    resetAdminPassword,
    listAdmins
} = require('./createAdmin');

// Configuration des couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

/**
 * Affiche l'aide
 */
const showHelp = () => {
    console.log(`
${colors.cyan}${colors.bright}🛠️  Gestionnaire d'Administrateurs - ESPRIT Student${colors.reset}

${colors.yellow}USAGE:${colors.reset}
  node scripts/adminCLI.js [command] [options]

${colors.yellow}COMMANDES:${colors.reset}
  ${colors.green}create${colors.reset}          Crée un admin par défaut
  ${colors.green}create-multiple${colors.reset} Crée plusieurs admins
  ${colors.green}list${colors.reset}            Liste tous les admins
  ${colors.green}reset${colors.reset}           Réinitialise le mot de passe d'un admin
  ${colors.green}help${colors.reset}            Affiche cette aide

${colors.yellow}EXEMPLES:${colors.reset}
  node scripts/adminCLI.js create
  node scripts/adminCLI.js create-multiple
  node scripts/adminCLI.js list
  node scripts/adminCLI.js reset admin@esprit.tn
  node scripts/adminCLI.js reset admin@esprit.tn NewPassword123!

${colors.yellow}INFORMATIONS:${colors.reset}
  - Tous les admins créés ont 'isFirstLogin: true'
  - Changez toujours les mots de passe par défaut
  - Les mots de passe doivent contenir au moins 8 caractères
    `);
};

/**
 * Gère la commande create
 */
const handleCreate = async () => {
    try {
        console.log(`${colors.blue}🚀 Création d'un admin par défaut...${colors.reset}`);
        await createDefaultAdmin();
    } catch (error) {
        console.error(`${colors.red}❌ Échec de la création:${colors.reset}`, error.message);
        process.exit(1);
    }
};

/**
 * Gère la commande create-multiple
 */
const handleCreateMultiple = async () => {
    try {
        console.log(`${colors.blue}🚀 Création de plusieurs admins...${colors.reset}`);
        await createMultipleAdmins();
    } catch (error) {
        console.error(`${colors.red}❌ Échec de la création:${colors.reset}`, error.message);
        process.exit(1);
    }
};

/**
 * Gère la commande list
 */
const handleList = async () => {
    try {
        console.log(`${colors.blue}📋 Récupération de la liste des admins...${colors.reset}`);
        await listAdmins();
    } catch (error) {
        console.error(`${colors.red}❌ Échec de la récupération:${colors.reset}`, error.message);
        process.exit(1);
    }
};

/**
 * Gère la commande reset
 */
const handleReset = async (email, newPassword) => {
    try {
        if (!email) {
            console.error(`${colors.red}❌ Email requis pour la réinitialisation${colors.reset}`);
            console.log(`${colors.yellow}Usage: node scripts/adminCLI.js reset admin@esprit.tn [nouveauMotDePasse]${colors.reset}`);
            process.exit(1);
        }

        console.log(`${colors.blue}🔄 Réinitialisation du mot de passe pour ${email}...${colors.reset}`);
        await resetAdminPassword(email, newPassword);
    } catch (error) {
        console.error(`${colors.red}❌ Échec de la réinitialisation:${colors.reset}`, error.message);
        process.exit(1);
    }
};

/**
 * Fonction principale
 */
const main = async () => {
    const command = process.argv[2];
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];

    // Connexion à la base de données
    try {
        await connectDB();
        console.log(`${colors.green}✅ Connecté à la base de données${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}❌ Erreur de connexion à la base de données:${colors.reset}`, error.message);
        process.exit(1);
    }

    // Gestion des commandes
    try {
        switch (command) {
            case 'create':
                await handleCreate();
                break;
            
            case 'create-multiple':
                await handleCreateMultiple();
                break;
            
            case 'list':
                await handleList();
                break;
            
            case 'reset':
                await handleReset(arg1, arg2);
                break;
            
            case 'help':
            case '--help':
            case '-h':
                showHelp();
                break;
            
            default:
                if (!command) {
                    showHelp();
                } else {
                    console.error(`${colors.red}❌ Commande inconnue: ${command}${colors.reset}`);
                    console.log(`${colors.yellow}Tapez 'node scripts/adminCLI.js help' pour voir l'aide${colors.reset}`);
                    process.exit(1);
                }
        }
    } catch (error) {
        console.error(`${colors.red}❌ Erreur lors de l'exécution:${colors.reset}`, error.message);
        process.exit(1);
    } finally {
        // Déconnexion de la base de données
        await disconnectDB();
        console.log(`${colors.green}✅ Déconnecté de la base de données${colors.reset}`);
    }
};

// Gestion des interruptions
process.on('SIGINT', async () => {
    console.log(`\n${colors.yellow}⚠️ Interruption reçue, nettoyage...${colors.reset}`);
    await disconnectDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(`\n${colors.yellow}⚠️ Terminaison reçue, nettoyage...${colors.reset}`);
    await disconnectDB();
    process.exit(0);
});

// Exécution
if (require.main === module) {
    main().catch(async (error) => {
        console.error(`${colors.red}❌ Erreur fatale:${colors.reset}`, error);
        await disconnectDB();
        process.exit(1);
    });
}

module.exports = { main };