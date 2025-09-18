const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const Club = require('../models/Club');
const User = require('../models/User');
const mailService = require('../utils/mailService');
const Logger = require('../utils/logger');

// Demander une réinitialisation de mot de passe
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email, userType } = req.body;

        if (!email || !userType) {
            return res.status(400).json({
                success: false,
                message: 'Email et type d\'utilisateur requis'
            });
        }

        // Déterminer le modèle selon le type d'utilisateur
        let Model;
        switch (userType.toLowerCase()) {
            case 'admin':
                Model = Admin;
                break;
            case 'club':
                Model = Club;
                break;
            case 'user':
                Model = User;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Type d\'utilisateur invalide'
                });
        }

        // Chercher l'utilisateur
        const user = await Model.findOne({ email: email.toLowerCase() });

        // Toujours retourner succès pour des raisons de sécurité
        // (ne pas révéler si l'email existe ou non)
        if (!user) {
            return res.json({
                success: true,
                message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
            });
        }

        // Générer un token de réinitialisation
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Sauvegarder le token et sa date d'expiration (1 heure)
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 heure
        await user.save();

        // Créer le lien de réinitialisation
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&type=${userType}`;

        // Préparer l'email
        const emailData = {
            to: email,
            subject: 'Réinitialisation de votre mot de passe - ESPRIT Student',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1f2937;">Réinitialisation de mot de passe</h2>
                    <p>Bonjour ${user.nom || user.prenom || 'Utilisateur'},</p>
                    <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ESPRIT Student.</p>
                    <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
                    <div style="margin: 20px 0;">
                        <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Réinitialiser le mot de passe
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">
                        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                        <span style="word-break: break-all;">${resetUrl}</span>
                    </p>
                </div>
            `
        };

        // Envoyer l'email
        await mailService.sendEmail(emailData);

        // Logger l'action
        await Logger.logAdminAction(
            user._id,
            'password_reset_requested',
            `Demande de réinitialisation de mot de passe pour ${email}`,
            userType,
            null,
            {
                email,
                userType,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
        });

    } catch (err) {
        console.error('Erreur requestPasswordReset:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
};

// Réinitialiser le mot de passe avec le token
exports.resetPassword = async (req, res) => {
    try {
        const { token, userType, newPassword, confirmPassword } = req.body;

        if (!token || !userType || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont requis'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Les mots de passe ne correspondent pas'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Le mot de passe doit contenir au moins 6 caractères'
            });
        }

        // Hasher le token reçu pour le comparer
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Déterminer le modèle selon le type d'utilisateur
        let Model;
        switch (userType.toLowerCase()) {
            case 'admin':
                Model = Admin;
                break;
            case 'club':
                Model = Club;
                break;
            case 'user':
                Model = User;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Type d\'utilisateur invalide'
                });
        }

        // Chercher l'utilisateur avec le token valide
        const user = await Model.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token invalide ou expiré'
            });
        }

        // Hasher le nouveau mot de passe
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Mettre à jour le mot de passe et supprimer le token
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        // Logger l'action
        await Logger.logAdminAction(
            user._id,
            'password_reset_completed',
            `Mot de passe réinitialisé pour ${user.email}`,
            userType,
            null,
            {
                email: user.email,
                userType,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            message: 'Mot de passe réinitialisé avec succès'
        });

    } catch (err) {
        console.error('Erreur resetPassword:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
};

// Vérifier la validité d'un token de réinitialisation
exports.verifyResetToken = async (req, res) => {
    try {
        const { token, userType } = req.query;

        if (!token || !userType) {
            return res.status(400).json({
                success: false,
                message: 'Token et type d\'utilisateur requis'
            });
        }

        // Hasher le token reçu pour le comparer
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Déterminer le modèle selon le type d'utilisateur
        let Model;
        switch (userType.toLowerCase()) {
            case 'admin':
                Model = Admin;
                break;
            case 'club':
                Model = Club;
                break;
            case 'user':
                Model = User;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Type d\'utilisateur invalide'
                });
        }

        // Chercher l'utilisateur avec le token valide
        const user = await Model.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        }).select('email nom prenom');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token invalide ou expiré'
            });
        }

        res.json({
            success: true,
            message: 'Token valide',
            data: {
                email: user.email,
                nom: user.nom,
                prenom: user.prenom
            }
        });

    } catch (err) {
        console.error('Erreur verifyResetToken:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
};