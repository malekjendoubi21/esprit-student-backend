const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    nom: { 
        type: String, 
        required: true,
        trim: true
    },
    prenom: { 
        type: String, 
        required: true,
        trim: true
    },
    role: { 
        type: String, 
        enum: ['admin', 'moderateur', 'club_manager'],
        default: 'club_manager'
    },
    telephone: {
        type: String,
        trim: true
    },
    statut: { 
        type: String, 
        enum: ['actif', 'inactif', 'suspendu'],
        default: 'actif' 
    },
    derniereConnexion: {
        type: Date,
        default: Date.now
    },
    permissions: [{
        type: String,
        enum: ['create_club', 'edit_club', 'delete_club', 'create_event', 'edit_event', 'delete_event', 'validate_event', 'manage_users']
    }],
    // Club assigné si c'est un club manager
    clubAssigne: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Club',
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index pour optimiser les recherches
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ statut: 1 });

// Virtual pour le nom complet
userSchema.virtual('nomComplet').get(function() {
    return `${this.prenom} ${this.nom}`;
});

// Méthode pour vérifier les permissions
userSchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission) || this.role === 'admin';
};

module.exports = mongoose.model('User', userSchema);