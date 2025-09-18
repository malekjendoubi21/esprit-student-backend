const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
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
    categorie: {
        type: String,
        enum: ['sportif', 'culturel', 'technologique', 'social', 'academique', 'entrepreneurial', 'Autre'],
        required: true
    },
    description: {
        type: String,
        maxlength: 500
    },
    membres: {
        type: Number,
        default: 0,
        min: 0
    },
    president: {
        nom: String,
        prenom: String,
        email: String,
        telephone: String
    },
    fondation: Date,
    activites: [String],
    prochainEvent: String,
    lienRecrutement: String,
    reseauxSociaux: {
        facebook: String,
        instagram: String,
        linkedin: String,
        twitter: String,
        youtube: String
    },
    siteWeb: String,
    detailsComplets: {
        nomComplet: String,
        presentation: {
            type: String,
            maxlength: 2000
        },
        objectifs: [String],
        activitesDetaillees: [String],
        focusCompetition: String,
        valeurs: [String],
        benefices: [String],
        images: [String],
        logo: String,
        imageCouverture: String,
        video: String,
        localisation: String,
        horairesReunion: String
    },
    // Images du club
    images: {
        type: [String],
        validate: {
            validator: function(arr) {
                return arr.length <= 3;
            },
            message: 'Maximum 3 images autorisées'
        },
        default: []
    },
    imageCouverture: {
        type: String,
        default: ''
    },
    contact: {
        telephone: String,
        adresse: String,
        email: String
    },
    statut: { 
        type: String, 
        enum: ['actif', 'inactif', 'suspendu', 'en_attente'],
        default: "en_attente" 
    },
    valide: {
        type: Boolean,
        default: false
    },
    valideePar: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    dateValidation: {
        type: Date,
        default: null
    },
    profileComplet: { 
        type: Boolean, 
        default: false 
    },
    premiereConnexion: { 
        type: Boolean, 
        default: true 
    },
    // Statistiques
    stats: {
        nombreEvents: { type: Number, default: 0 },
        nombreEventsValides: { type: Number, default: 0 },
        derniereActivite: { type: Date, default: Date.now }
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index pour optimiser les recherches
clubSchema.index({ nom: 1 });
clubSchema.index({ categorie: 1 });
clubSchema.index({ statut: 1 });
clubSchema.index({ email: 1 });

// Virtual pour les événements du club
clubSchema.virtual('events', {
    ref: 'Event',
    localField: '_id',
    foreignField: 'clubId'
});

// Méthode pour vérifier si le profil est complet
clubSchema.methods.isProfileComplete = function() {
    return this.detailsComplets.presentation && 
           this.detailsComplets.objectifs.length > 0 &&
           this.president.nom && 
           this.president.email &&
           this.contact.telephone;
};

// Méthode pour valider le club (appelée quand créé par admin)
clubSchema.methods.validateByAdmin = function(adminId) {
    this.valide = true;
    this.valideePar = adminId;
    this.dateValidation = new Date();
    this.statut = 'actif';
    return this.save();
};

// Middleware pour mettre à jour profileComplet avant sauvegarde
clubSchema.pre('save', function(next) {
    this.profileComplet = this.isProfileComplete();
    next();
});

module.exports = mongoose.model('Club', clubSchema);
