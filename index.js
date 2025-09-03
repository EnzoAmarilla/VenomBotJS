const express = require('express');
const venom = require('venom-bot');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? process.env.PROD_BACKEND 
  : process.env.LOCAL_BACKEND;

const app = express();
// Esto debe ir **después** de app.use(express.static(...))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuración de middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 📌 Diccionario para manejar múltiples sesiones
let sessions = {};

// ==========================
//   INICIALIZAR SESIONES
// ==========================
async function inicializarSesion(sessionId) {
  try {
    console.log(`🕷️ Iniciando sesión Venom: ${sessionId}...`);

    const client = await venom.create({
      session: sessionId,
      headless: true,
      useChrome: true,
      logQR: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
        console.log(`[${sessionId}] QR intento: ${attempts}`);
        io.emit('qrCode', { sessionId, qr: base64Qr, attempts });
      },
      statusFind: (statusSession, session) => {
        console.log(`[${sessionId}] Estado de sesión:`, statusSession);
        io.emit('sessionStatus', {
          sessionId,
          status: statusSession,
          isConnected: statusSession === 'isLogged'
        });
      }
    });

    sessions[sessionId] = { client, isConnected: true };
    configurarListeners(client, sessionId);

    console.log(`✅ Sesión ${sessionId} conectada!`);
    io.emit('connected', { sessionId, message: `WhatsApp ${sessionId} conectado!` });

  } catch (error) {
    console.error(`❌ Error en sesión ${sessionId}:`, error);
    io.emit('error', { sessionId, message: 'Error al conectar WhatsApp', error: error.message });
  }
}

// ==========================
//   LISTENERS DE MENSAJES
// ==========================
function configurarListeners(client, sessionId) {
  client.onMessage(async (message) => {
    if (message.from === "status@broadcast" || message.isGroupMsg) return;

    console.log(`[${sessionId}] 📩 Mensaje:`, message.body);

    // Emitir al frontend
    io.emit('messageReceived', {
      sessionId,
      from: message.from,
      body: message.body,
      timestamp: new Date().toLocaleString()
    });

    // Enviar al backend Laravel
    axios.post(`${BACKEND_URL}/api/webhook/whatsapp`, {
      session: sessionId,
      from: message.from,
      to: message.to,
      body: message.body.trim(),
      client_name: message.notifyName,
    }).catch(() => console.log(`[${sessionId}] ❌ Mensaje no enviado al backend`));
  });

  client.onStateChange((state) => {
    console.log(`[${sessionId}] 🔄 Estado cambiado:`, state);
    io.emit('stateChange', { sessionId, state });
  });
}

// ==========================
//        RUTAS API
// ==========================

// Crear nueva sesión
app.post('/api/start-session', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Falta sessionId' });

  if (sessions[sessionId]) {
    return res.json({ success: true, message: `Sesión ${sessionId} ya existe` });
  }

  inicializarSesion(sessionId);
  res.json({ success: true, message: `Sesión ${sessionId} iniciada` });
});

// Enviar mensaje desde una sesión
app.post('/api/send-message', async (req, res) => {
  const { sessionId, to, message } = req.body;

  if (!sessions[sessionId] || !sessions[sessionId].isConnected) {
    return res.status(400).json({ success: false, error: `Sesión ${sessionId} no está conectada` });
  }

  try {
    const result = await sessions[sessionId].client.sendText(to, message);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estado de una sesión
app.get('/api/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!sessions[sessionId]) {
    return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
  }

  res.json({
    sessionId,
    isConnected: sessions[sessionId].isConnected,
  });
});

// ==========================
//     SOCKET.IO CLIENTES
// ==========================
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// ==========================
//     INICIAR SERVIDOR
// ==========================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`🌐 Abre tu navegador en: http://localhost:${PORT}\n`);
});

// ==========================
//  MANEJAR CIERRE SERVIDOR
// ==========================
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando aplicación...');

  for (let sessionId in sessions) {
    try {
      await sessions[sessionId].client.close();
      console.log(`✅ Sesión ${sessionId} cerrada correctamente`);
    } catch (error) {
      console.error(`❌ Error al cerrar sesión ${sessionId}:`, error);
    }
  }

  process.exit(0);
});