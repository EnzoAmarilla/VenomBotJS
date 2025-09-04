// index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const { Client, LocalAuth } = require('whatsapp-web.js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ========= ENV de Laravel =========
const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? process.env.PROD_BACKEND    // ej: https://reservaturnos.com
  : process.env.LOCAL_BACKEND;  // ej: http://127.0.0.1:8000

const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || ''; // opcional seguridad

// ========= Middleware / estáticos =========
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========= Mapa de sesiones =========
/**
 * sessions[sessionId] = {
 *   client: whatsapp-web.js Client,
 *   ready: boolean
 * }
 */
const sessions = {};

// ========= Helpers =========
function onlyPrivate1to1(msg) {
  console.log(msg.from);
  console.log(msg.fromMe);
  // Ignorar grupos
  if (msg.from?.endsWith('@g.us')) return false;
  // Ignorar estados
  if (msg.from === 'status@broadcast') return false;
  // Ignorar canales/newsletter (WA los marca como @newsletter)
  if (msg.from?.endsWith('@newsletter')) return false;
  // Ignorar mensajes que envías vos mismo
  if (msg.fromMe) return false;
  // Quedarnos con chats persona a persona
  return msg.from?.endsWith('@c.us');
}

function ensureSession(sessionId) {
  if (sessions[sessionId]) return sessions[sessionId];

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: String(sessionId),                      // cada profesional = un almacén distinto
      dataPath: path.join(__dirname, 'tokens')          // persistencia en disco (sobrevive reinicios)
    }),
    puppeteer: {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  // Eventos de WhatsApp
  client.on('qr', (qr) => {
    // Enviamos el QR en texto (el frontend lo renderiza)
    io.to(String(sessionId)).emit('qr', { sessionId, qr });
    io.to(String(sessionId)).emit('status', { sessionId, status: 'qr' });
  });

  client.on('ready', async () => {
    sessions[sessionId].ready = true;
    io.to(String(sessionId)).emit('connected', { sessionId, message: 'WhatsApp conectado' });
    io.to(String(sessionId)).emit('status', { sessionId, status: 'ready' });
    console.log(`✅ [${sessionId}] listo`);
  });

  client.on('disconnected', (reason) => {
    sessions[sessionId].ready = false;
    io.to(String(sessionId)).emit('status', { sessionId, status: 'disconnected', reason });
    console.log(`⚠️ [${sessionId}] desconectado: ${reason}`);
    // Opción: reintentar
    client.initialize().catch(() => {});
  });

  client.on('message', async (msg) => {
    if (!onlyPrivate1to1(msg)) return;

    // Emitimos a la UI de ese profesional (para que lo vea en vivo si la tiene abierta)
    io.to(String(sessionId)).emit('messageReceived', {
      sessionId,
      from: msg.from,
      body: msg.body,
      timestamp: new Date().toISOString()
    });

    // Mandamos a Laravel para que procese la lógica de reservas
    try {
      await axios.post(
        `${BACKEND_URL}/api/webhook/whatsapp`,
        {
          session: sessionId,
          from: msg.from,
          to: msg.to,             // tu número del profesional
          body: (msg.body || '').trim(),
          client_name: msg._data?.notifyName || null
        },
        {
          timeout: 15000,
          headers: WEBHOOK_TOKEN ? { 'X-Webhook-Token': WEBHOOK_TOKEN } : {}
        }
      );
    } catch (err) {
      console.log(`[${sessionId}] ❌ No pude notificar a Laravel:`, err?.message);
    }
  });

  client.initialize().catch(err => {
    console.error(`❌ [${sessionId}] init error:`, err?.message || err);
  });

  sessions[sessionId] = { client, ready: false };
  return sessions[sessionId];
}

// ========= Socket.IO =========
io.on('connection', (socket) => {
  // El frontend manda "join" con el sessionId de la URL
  socket.on('join', (sessionId) => {
    const room = String(sessionId);
    socket.join(room);
    socket.emit('status', { sessionId, status: 'joined' });
  });

  socket.on('disconnect', () => {});
});

// ========= Rutas API =========
// 1) Iniciar/asegurar sesión (lo llama el frontend al cargar la vista)
app.post('/api/start-session', (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Falta sessionId' });

  ensureSession(String(sessionId));
  return res.json({ success: true, sessionId });
});

// 2) Enviar mensaje (lo llama Laravel)
app.post('/api/send-message', async (req, res) => {
  const { sessionId, to, message } = req.body || {};
  if (!sessionId || !to || !message) {
    return res.status(400).json({ success: false, error: 'Faltan parámetros (sessionId, to, message)' });
  }

  const s = sessions[String(sessionId)];
  if (!s || !s.ready) {
    return res.status(400).json({ success: false, error: `Sesión ${sessionId} no está lista` });
  }

  try {
    const chatId = to.endsWith('@c.us') ? to : `${to}@c.us`;
    await s.client.sendMessage(chatId, message);
    return res.json({ success: true, to: chatId, message });
  } catch (err) {
    console.error(`❌ [${sessionId}] send-message error:`, err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Send failed' });
  }
});

// 3) (Opcional) estado de una sesión
app.get('/api/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const s = sessions[String(sessionId)];
  res.json({ sessionId, ready: !!(s && s.ready) });
});

// ========= Rutas estáticas / catch-all =========
app.get('*', (req, res) => {
  // sirve tu HTML de vinculación
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========= Arranque =========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Bot escuchando en http://localhost:${PORT}`);
});