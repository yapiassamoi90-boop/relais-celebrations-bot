// server.js - Version Optimisée pour Railway (H@B)
const express = require('express');
const app = express();
const http = require('http').createServer(app);

const io = require('socket.io')(http, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// MODIFICATION ICI : On utilise un dossier local pour la session
const client = new Client({
    authStrategy: new LocalAuth({ 
        clientId: "hab-relais-session" 
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// -- GESTION DU QR CODE --
client.on('qr', (qr) => {
    console.log('--- NOUVEAU QR CODE GÉNÉRÉ ---');
    // Affiche dans les logs Railway (IMPORTANT : regarde bien tes Deploy Logs)
    qrcode.generate(qr, {small: true}); 
    // Envoie à ton index.html
    io.emit('qr', qr); 
});

client.on('ready', () => {
    console.log('--- LE BOT H@B RELAIS EST PRÊT ! ---');
    io.emit('ready');
});

// Gestion des messages
client.on('message', async (msg) => {
    try {
        const chat = await msg.getChat();
        console.log(`Message de : ${chat.name} (ID: ${chat.id._serialized})`);

        if (chat.name.includes('CÉLÉBRATION')) { 
            let messageData = {
                sender: msg.author || msg.from,
                type: msg.type,
                body: msg.body,
                timestamp: msg.timestamp
            };

            if (msg.hasMedia) {
                const media = await msg.downloadMedia();
                if (media) {
                    messageData.mediaUrl = `data:${media.mimetype};base64,${media.data}`;
                }
            }
            io.emit('whatsapp_message', messageData);
        }
    } catch (e) {
        console.error("Erreur message:", e);
    }
});

// Port Railway dynamique
const PORT = process.env.PORT || 8080; 
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur en ligne sur le port ${PORT}`);
    client.initialize().catch(err => console.error("Erreur Init:", err));
});
