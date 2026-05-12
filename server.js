const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

// Configuration du client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }), 
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ],
        executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome'
    }
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Événement QR Code : On génère une image et on l'envoie au Web
client.on('qr', async (qr) => {
    console.log('--- NOUVEAU QR CODE GÉNÉRÉ ---');
    qrcodeTerminal.generate(qr, { small: true });
    
    try {
        const url = await qrcode.toDataURL(qr);
        io.emit('qr_image', url); // On envoie l'image prête à l'emploi
    } catch (err) {
        console.error('Erreur QR:', err);
    }
});

client.on('ready', () => {
    console.log('--- LE BOT H@B EST PRÊT ! ---');
    io.emit('ready');
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    console.log(`Message de: ${chat.name} | ID: ${chat.id._serialized}`);

    if (chat.name.includes('CÉLÉBRATION')) {
        io.emit('whatsapp_message', {
            sender: msg.author || msg.from,
            body: msg.body,
            type: msg.type
        });
    }
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Serveur actif sur le port ${port}`);
    client.initialize().catch(err => console.error("Erreur Init:", err));
});