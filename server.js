// server.js - Version corrigée par H@B
const express = require('express');
const app = express();
const http = require('http').createServer(app);

// Configuration Socket.io
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
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

const client = new Client({
    authStrategy: new LocalAuth({ 
        dataPath: '/tmp/.wwebjs_auth' 
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
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
    qrcode.generate(qr, {small: true}); // Affiche dans le terminal
    io.emit('qr', qr); // ENVOIE le QR code à l'interface Web (index.html)
});

client.on('ready', () => {
    console.log('--- LE BOT H@B RELAIS EST PRÊT ! ---');
    io.emit('ready'); // Informe le web que la connexion est réussie
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    
    // LOG POUR RÉCUPÉRER TON ID DE GROUPE
    console.log(`Message reçu de : ${chat.name} | ID: ${chat.id._serialized}`);

    // Utilisation de .includes pour éviter les erreurs d'espaces dans le nom
    if (chat.name.includes('CÉLÉBRATION')) { 
        let messageData = {
            sender: msg.author || msg.from,
            type: msg.type,
            body: msg.body,
            timestamp: msg.timestamp
        };

        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            if (msg.type === 'ptt') {
                messageData.type = 'ptt';
                messageData.mediaUrl = `data:${media.mimetype};base64,${media.data}`;
            }
        }
        
        io.emit('whatsapp_message', messageData);
    }
});

io.on('connection', (socket) => {
    console.log('Interface Web connectée.');

    socket.on('send_to_whatsapp', async (data) => {
        // REMPLACE CET ID par celui que tu verras dans tes logs (ex: 120363... @g.us)
        const targetGroupId = 'TON_ID_DE_GROUPE_ICI@g.us'; 
        
        try {
            await client.sendMessage(targetGroupId, data.message);
        } catch (error) {
            console.error('Erreur envoi:', error);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur en ligne sur le port ${PORT}`);
    client.initialize();
});