require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/Admin');
const User = require('./models/User');
const Club = require('./models/Club');
const Event = require('./models/Event');
const connectDB = require('./config/db');

const initializeData = async () => {
    try {
        // Connexion à la base de données
        await connectDB();
        console.log('✅ Connexion à MongoDB établie');

        // Nettoyer les données existantes (optionnel)
        console.log('🧹 Nettoyage des données existantes...');
        await Admin.deleteMany({});
        await User.deleteMany({});
        await Club.deleteMany({});
        await Event.deleteMany({});

        // Créer un admin par défaut
        console.log('👤 Création de l\'admin par défaut...');
        const adminPassword = await bcrypt.hash('admin123', 10);
        const admin = new Admin({
            email: 'admin@esprit.tn',
            password: adminPassword,
            nom: 'Administrateur',
            prenom: 'Principal',
            role: 'admin'
        });
        await admin.save();
        console.log('✅ Admin créé: admin@esprit.tn / admin123');

        // Créer quelques utilisateurs
        console.log('👥 Création des utilisateurs...');
        const users = [
            {
                email: 'manager1@esprit.tn',
                password: await bcrypt.hash('manager123', 10),
                nom: 'Ben Ahmed',
                prenom: 'Salma',
                role: 'club_manager',
                telephone: '12345678',
                permissions: ['create_event', 'edit_event']
            },
            {
                email: 'manager2@esprit.tn',
                password: await bcrypt.hash('manager123', 10),
                nom: 'Trabelsi',
                prenom: 'Ahmed',
                role: 'moderateur',
                telephone: '87654321',
                permissions: ['validate_event']
            }
        ];

        const createdUsers = await User.insertMany(users);
        console.log(`✅ ${createdUsers.length} utilisateurs créés`);

        // Créer quelques clubs
        console.log('🏛️ Création des clubs...');
        const clubs = [
            {
                email: 'acm@esprit.tn',
                password: await bcrypt.hash('acm123', 10),
                nom: 'ACM ESPRIT',
                categorie: 'technologique',
                description: 'Club de programmation et technologies',
                membres: 45,
                president: {
                    nom: 'Mansouri',
                    prenom: 'Youssef',
                    email: 'youssef.mansouri@esprit.tn',
                    telephone: '55123456'
                },
                fondation: new Date('2018-09-01'),
                activites: ['Hackathons', 'Formations', 'Compétitions'],
                contact: {
                    telephone: '55123456',
                    email: 'acm@esprit.tn',
                    adresse: 'ESPRIT Campus'
                },
                detailsComplets: {
                    presentation: 'ACM ESPRIT est le club de programmation et technologies de l\'école.',
                    objectifs: ['Promouvoir la programmation', 'Organiser des hackathons', 'Former aux nouvelles technologies'],
                    activitesDetaillees: ['Hackathons mensuels', 'Formations React/Angular', 'Compétitions de programmation'],
                    valeurs: ['Innovation', 'Collaboration', 'Excellence']
                },
                reseauxSociaux: {
                    facebook: 'https://facebook.com/acmesprit',
                    instagram: 'https://instagram.com/acm_esprit'
                },
                statut: 'actif',
                profileComplet: true,
                premiereConnexion: false,
                responsable: createdUsers[0]._id
            },
            {
                email: 'enactus@esprit.tn',
                password: await bcrypt.hash('enactus123', 10),
                nom: 'Enactus ESPRIT',
                categorie: 'entrepreneurial',
                description: 'Club d\'entrepreneuriat social',
                membres: 38,
                president: {
                    nom: 'Kammoun',
                    prenom: 'Leila',
                    email: 'leila.kammoun@esprit.tn',
                    telephone: '55987654'
                },
                fondation: new Date('2017-10-15'),
                activites: ['Projets sociaux', 'Formations entrepreneuriat', 'Compétitions'],
                contact: {
                    telephone: '55987654',
                    email: 'enactus@esprit.tn',
                    adresse: 'ESPRIT Campus'
                },
                detailsComplets: {
                    presentation: 'Enactus ESPRIT développe l\'esprit entrepreneurial avec un impact social.',
                    objectifs: ['Développer l\'entrepreneuriat social', 'Former les leaders de demain', 'Créer un impact positif'],
                    activitesDetaillees: ['Projets d\'impact social', 'Formations en business', 'Compétitions nationales et internationales']
                },
                statut: 'actif',
                profileComplet: true,
                premiereConnexion: false
            },
            {
                email: 'sport@esprit.tn',
                password: await bcrypt.hash('sport123', 10),
                nom: 'Club Sport ESPRIT',
                categorie: 'sportif',
                description: 'Club sportif multidisciplinaire',
                membres: 75,
                president: {
                    nom: 'Hadj Ali',
                    prenom: 'Karim',
                    email: 'karim.hadjali@esprit.tn',
                    telephone: '55456789'
                },
                fondation: new Date('2015-02-20'),
                activites: ['Football', 'Basketball', 'Tennis', 'Natation'],
                contact: {
                    telephone: '55456789',
                    email: 'sport@esprit.tn'
                },
                detailsComplets: {
                    presentation: 'Le club sport offre diverses activités sportives pour tous les niveaux.',
                    objectifs: ['Promouvoir le sport', 'Maintenir la forme physique', 'Créer l\'esprit d\'équipe']
                },
                statut: 'en_attente',
                profileComplet: false,
                premiereConnexion: true
            }
        ];

        const createdClubs = await Club.insertMany(clubs);
        console.log(`✅ ${createdClubs.length} clubs créés`);

        // Assigner les clubs aux utilisateurs
        createdUsers[0].clubAssigne = createdClubs[0]._id;
        await createdUsers[0].save();

        // Créer quelques événements
        console.log('🎉 Création des événements...');
        const events = [
            {
                clubId: createdClubs[0]._id,
                titre: 'Hackathon IA 2024',
                description: 'Concours de développement d\'applications utilisant l\'intelligence artificielle',
                dateDebut: new Date('2024-03-15T09:00:00Z'),
                dateFin: new Date('2024-03-16T18:00:00Z'),
                heureDebut: '09:00',
                heureFin: '18:00',
                lieu: 'Laboratoire Informatique',
                adresse: 'ESPRIT Campus, Ariana',
                capaciteMax: 50,
                typeEvent: 'competition',
                public: 'etudiants',
                gratuit: true,
                contact: {
                    nom: 'Youssef Mansouri',
                    telephone: '55123456',
                    email: 'acm@esprit.tn'
                },
                medias: {
                    affiche: 'hackathon_ia_2024.jpg'
                },
                statut: 'valide',
                tags: ['IA', 'programmation', 'concours'],
                valideBy: admin._id,
                dateValidation: new Date()
            },
            {
                clubId: createdClubs[0]._id,
                titre: 'Formation React.js',
                description: 'Formation intensive sur React.js pour débutants et intermédiaires',
                dateDebut: new Date('2024-02-20T14:00:00Z'),
                dateFin: new Date('2024-02-20T17:00:00Z'),
                heureDebut: '14:00',
                heureFin: '17:00',
                lieu: 'Amphithéâtre A',
                typeEvent: 'formation',
                public: 'etudiants',
                gratuit: true,
                statut: 'en_attente',
                tags: ['React', 'formation', 'web']
            },
            {
                clubId: createdClubs[1]._id,
                titre: 'Conférence Entrepreneuriat Social',
                description: 'Rencontre avec des entrepreneurs sociaux tunisiens',
                dateDebut: new Date('2024-03-01T15:00:00Z'),
                dateFin: new Date('2024-03-01T17:30:00Z'),
                lieu: 'Auditorium Principal',
                typeEvent: 'conference',
                public: 'mixte',
                gratuit: true,
                statut: 'valide',
                tags: ['entrepreneuriat', 'social', 'conférence'],
                valideBy: admin._id,
                dateValidation: new Date()
            },
            {
                clubId: createdClubs[2]._id,
                titre: 'Tournoi de Football',
                description: 'Tournoi inter-classes de football',
                dateDebut: new Date('2024-04-10T08:00:00Z'),
                dateFin: new Date('2024-04-10T16:00:00Z'),
                lieu: 'Terrain de Football',
                typeEvent: 'competition',
                public: 'etudiants',
                gratuit: true,
                statut: 'en_attente',
                tags: ['football', 'sport', 'tournoi']
            }
        ];

        const createdEvents = await Event.insertMany(events);
        console.log(`✅ ${createdEvents.length} événements créés`);

        // Mettre à jour les statistiques des clubs
        for (let club of createdClubs) {
            const eventCount = await Event.countDocuments({ clubId: club._id });
            const validEventCount = await Event.countDocuments({ clubId: club._id, statut: 'valide' });
            
            await Club.findByIdAndUpdate(club._id, {
                'stats.nombreEvents': eventCount,
                'stats.nombreEventsValides': validEventCount,
                'stats.derniereActivite': new Date()
            });
        }

        console.log('\n🎉 Initialisation terminée avec succès !');
        console.log('\n📋 Comptes créés:');
        console.log('👤 Admin: admin@esprit.tn / admin123');
        console.log('👥 Manager: manager1@esprit.tn / manager123');
        console.log('👥 Manager: manager2@esprit.tn / manager123');
        console.log('🏛️ Club ACM: acm@esprit.tn / acm123');
        console.log('🏛️ Club Enactus: enactus@esprit.tn / enactus123');
        console.log('🏛️ Club Sport: sport@esprit.tn / sport123');

        console.log('\n📊 Données créées:');
        console.log(`- ${createdUsers.length} utilisateurs`);
        console.log(`- ${createdClubs.length} clubs`);
        console.log(`- ${createdEvents.length} événements`);

        console.log('\n🚀 Vous pouvez maintenant tester l\'API !');
        
        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        process.exit(1);
    }
};

// Exécuter l'initialisation si ce fichier est lancé directement
if (require.main === module) {
    initializeData();
}

module.exports = initializeData;