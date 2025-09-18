const mongoose = require('mongoose');
const Club = require('../models/Club');
require('dotenv').config();

async function cleanDatabase() {
    try {
        // Connexion à la base de données
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connexion à MongoDB réussie');

        // Supprimer le champ 'responsable' de tous les documents Club
        const result = await mongoose.connection.db.collection('clubs').updateMany(
            { responsable: { $exists: true } },
            { $unset: { responsable: 1 } }
        );

        console.log(`${result.modifiedCount} clubs mis à jour (champ responsable supprimé)`);

        // Vérifier qu'il n'y a plus de champs responsable
        const clubsWithResponsable = await mongoose.connection.db.collection('clubs').countDocuments(
            { responsable: { $exists: true } }
        );

        console.log(`Clubs restants avec le champ responsable: ${clubsWithResponsable}`);

        await mongoose.disconnect();
        console.log('Nettoyage terminé');

    } catch (error) {
        console.error('Erreur lors du nettoyage:', error);
        process.exit(1);
    }
}

cleanDatabase();