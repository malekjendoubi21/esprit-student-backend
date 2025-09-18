require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { createDefaultAdmin } = require('./scripts/createAdmin');

// Import des routes
const adminRoutes = require('./routes/adminRoutes');
const clubRoutes = require('./routes/clubRoutes');
const eventRoutes = require('./routes/eventRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const firstLoginRoutes = require('./routes/firstLoginRoutes');
const adminManagementRoutes = require('./routes/adminManagementRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');

// Import des middlewares
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connexion à la base de données et initialisation
const initializeApp = async () => {
    try {
        // Connexion à la base de données
        await connectDB();
        console.log('✅ Base de données connectée');

        // Création automatique d'un admin si nécessaire
        if (process.env.AUTO_CREATE_ADMIN !== 'false') {
            await createDefaultAdmin();
        }

        console.log('🎯 Application initialisée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        process.exit(1);
    }
};

// Initialiser l'application
initializeApp();

// Routes de base
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API Esprit Student - Backend fonctionnel',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            admin: '/api/admin',
            clubs: '/api/clubs',
            events: '/api/events',
            users: '/api/users',
            firstLogin: '/api/first-login',
            adminManagement: '/api/admin-management',
            passwordReset: '/api/password-reset'
        }
    });
});

// Configuration des routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/first-login', firstLoginRoutes);
app.use('/api/admin-management', adminManagementRoutes);
app.use('/api/password-reset', passwordResetRoutes);

// Middleware de gestion d'erreurs (doit être en dernier)
app.use(errorHandler);

// Gestion des routes non trouvées
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée',
        path: req.originalUrl
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📖 Documentation API disponible sur http://localhost:${PORT}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
});
