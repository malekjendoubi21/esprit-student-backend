const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nom: String,
    prenom: String,
    role: { type: String, default: 'admin' },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
