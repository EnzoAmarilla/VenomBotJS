const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  console.log('📱 Escaneá este QR con WhatsApp:');
  console.log(qr);
});

client.on('ready', () => {
  console.log('✅ Cliente conectado');
  client.sendMessage('5493484699717@c.us', 'Hola desde whatsapp-web.js 🚀');
});

client.initialize();