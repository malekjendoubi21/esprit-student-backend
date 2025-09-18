const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Vérifier la configuration email au démarrage
const verifyEmailConfig = async () => {
    try {
        await transporter.verify();
        console.log('✅ Configuration email valide');
        return true;
    } catch (error) {
        console.error('❌ Erreur configuration email:', error.message);
        return false;
    }
};

// Fonction d'envoi d'email basique (rétrocompatibilité)
const sendMail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: `"ESPRIT Student" <${process.env.MAIL_USER}>`,
            to,
            subject,
            text
        });
        console.log(`📧 Mail envoyé à ${to}`);
    } catch (err) {
        console.error('❌ Erreur envoi mail:', err);
        throw err;
    }
};

// Fonction d'envoi d'email avancée avec HTML
const sendEmail = async (emailData) => {
    try {
        const { to, subject, text, html, attachments } = emailData;

        if (!to || !subject) {
            throw new Error('Destinataire et sujet requis');
        }

        const mailOptions = {
            from: `"ESPRIT Student" <${process.env.MAIL_USER}>`,
            to,
            subject,
            text: text || '',
            html: html || text || '',
            attachments: attachments || []
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`📧 Email envoyé à ${to} - ID: ${result.messageId}`);
        return result;

    } catch (err) {
        console.error('❌ Erreur envoi email:', err);
        throw err;
    }
};

// Vérifier la configuration au chargement du module
verifyEmailConfig();

module.exports = {
    sendMail,           // Fonction originale pour rétrocompatibilité
    sendEmail,          // Nouvelle fonction avancée
    verifyEmailConfig   // Vérification config
};
