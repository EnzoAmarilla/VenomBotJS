const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(), // Guarda sesión en .wwebjs_auth
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Muestra el QR en consola
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

// Cuando se conecta
client.on('ready', () => {
  console.log('✅ Cliente conectado a WhatsApp');
  client.sendMessage('5493484699717@c.us', 'Hola desde whatsapp-web.js 🚀');
});

// Escucha mensajes entrantes
client.on('message', msg => {
  console.log(`📩 Mensaje recibido: ${msg.body}`);
});

client.initialize();