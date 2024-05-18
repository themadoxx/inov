const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
require('dotenv').config(); // Charger les variables d'environnement

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Configuration de Nodemailer pour SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true pour 465, false pour d'autres ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    logger: true,
    debug: true
});

// Fonction pour lire et compiler les modèles
const compileTemplate = (templateName, data) => {
    const filePath = path.join(__dirname, 'templates', templateName);
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    return template(data);
};

// Route pour envoyer des emails
app.post('/send-email', (req, res) => {
    const { name, email, message } = req.body;

    console.log('Received email request:', { name, email, message });

    // Préparer les options pour l'email de l'utilisateur
    const userMailOptions = {
        from: process.env.SMTP_USER, // Utiliser l'adresse e-mail authentifiée
        to: email,
        subject: 'Thank you for contacting us',
        html: compileTemplate('user-email.html', { name, message }),
    };

    // Préparer les options pour l'email de l'admin
    const adminMailOptions = {
        from: process.env.SMTP_USER, // Utiliser l'adresse e-mail authentifiée
        to: process.env.RECEIVER_EMAIL,
        subject: `New message from ${name}`,
        html: compileTemplate('admin-email.html', { name, email, message }),
    };

    // Envoyer l'email à l'utilisateur
    transporter.sendMail(userMailOptions, (error, info) => {
        if (error) {
            console.error('Error sending user email:', error);
            return res.status(500).json({ error: error.toString() });
        }
        
        console.log('User email sent:', info.response);

        // Envoyer l'email à l'admin
        transporter.sendMail(adminMailOptions, (error, info) => {
            if (error) {
                console.error('Error sending admin email:', error);
                return res.status(500).json({ error: error.toString() });
            }
            console.log('Admin email sent:', info.response);
            res.status(200).json({ success: 'Emails sent successfully!' });
        });
    });
});

// Route pour servir le fichier HTML principal
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
