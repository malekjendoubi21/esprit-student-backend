const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    clubId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Club', 
        required: true 
    },
    titre: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    dateDebut: { 
        type: Date, 
        required: true 
    },
    dateFin: { 
        type: Date, 
        required: true 
    },
    heureDebut: String,
    heureFin: String,
    lieu: {
        type: String,
        required: true
    },
    adresse: String,
    capaciteMax: {
        type: Number,
        min: 1
    },
    typeEvent: {
        type: String,
        enum: ['conference', 'atelier', 'competition', 'sortie', 'formation', 'reunion', 'ceremonie', 'autre'],
        required: true
    },
    public: {
        type: String,
        enum: ['etudiants', 'professeurs', 'externe', 'mixte'],
        default: 'etudiants'
    },
    gratuit: {
        type: Boolean,
        default: true
    },
    prix: {
        type: Number,
        default: 0
    },
    lienFormulaire: String,
    lienMeet: String,
    contact: {
        nom: String,
        telephone: String,
        email: String
    },
    medias: {
        affiche: String,
        images: [String],
        video: String
    },
    statut: { 
        type: String, 
        enum: ["en_attente", "valide", "rejete", "annule", "termine"],
        default: "en_attente" 
    },
    raisonRejet: String,
    // Qui a validé l'événement
    valideBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null
    },
    dateValidation: Date,
    // Statistiques
    stats: {
        vues: { type: Number, default: 0 },
        inscriptions: { type: Number, default: 0 },
        partages: { type: Number, default: 0 }
    },
    tags: [String], // Pour faciliter la recherche
    visible: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index pour optimiser les recherches
eventSchema.index({ clubId: 1 });
eventSchema.index({ statut: 1 });
eventSchema.index({ dateDebut: 1 });
eventSchema.index({ typeEvent: 1 });
eventSchema.index({ titre: 'text', description: 'text' }); // Recherche textuelle

// Virtual pour le club organisateur
eventSchema.virtual('club', {
    ref: 'Club',
    localField: 'clubId',
    foreignField: '_id',
    justOne: true
});

// Méthode pour vérifier si l'événement est passé
eventSchema.methods.isPasse = function() {
    return this.dateFin < new Date();
};

// Méthode pour vérifier si l'événement peut être modifié
eventSchema.methods.peutEtreModifie = function() {
    return this.statut === 'en_attente' || this.statut === 'rejete';
};

// Validation personnalisée pour les dates
eventSchema.pre('save', function(next) {
    if (this.dateDebut >= this.dateFin) {
        next(new Error('La date de fin doit être postérieure à la date de début'));
    }
    
    if (this.dateDebut < new Date()) {
        next(new Error('La date de début ne peut pas être dans le passé'));
    }
    
    next();
});

module.exports = mongoose.model('Event', eventSchema);
