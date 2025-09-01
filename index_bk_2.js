// venom-server.js
const express = require('express');
const axios = require('axios');
const { create } = require('venom-bot');

const app = express();
const port = 3000;
const sessions = {};

app.use(express.json());

/**
 * Crear o recuperar sesión
 */
app.get('/start/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;

  if (sessions[sessionId]) {
    return res.json({ status: 'connected', message: 'Session already active' });
  }

  try {
    create(
      sessionId,
      // Evento QR
      (base64Qr, asciiQR, attempts, urlCode) => {
        console.log(`🔑 QR generado para ${sessionId}`);
        sessions[sessionId].lastQr = base64Qr;

        // Podés notificar a Laravel para guardar el QR si querés
        axios.post('http://127.0.0.1:8000/api/whatsapp/qr', {
          sessionId,
          qr: base64Qr,
        }).catch(() => {});
      },
      // Evento status
      (statusSession, sessionName) => {
        console.log(`📡 Estado sesión ${sessionName}: ${statusSession}`);
        // Avisar a Laravel cuando la sesión cambie de estado
        axios.post('http://127.0.0.1:8000/api/whatsapp/status', {
          sessionId: sessionName,
          status: statusSession,
        }).catch(() => {});
      },
      {
        multidevice: true,
        headless: 'new',
        qrTimeout: 0,     // ⚡ nunca expira el QR
        autoClose: 0,     // ⚡ nunca se autocierra la sesión aunque no escanees
        disableWelcome: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      }
    ).then((client) => {
      console.log('✅ Sesión iniciada correctamente!');
      sessions[sessionId] = { client };

      // 🔔 Manejo de mensajes entrantes
      client.onMessage((message) => {
        console.log('📩 Mensaje recibido:', message.body);
        axios.post('http://127.0.0.1:8000/api/webhook/whatsapp', {
          sessionId,
          message,
        }).catch(() => {});
      });

      res.json({
        status: 'pending',
        message: 'Session created, waiting for QR',
      });
    });
  } catch (err) {
    console.error('❌ Error creando sesión', err);
    res.status(500).json({ error: 'Error creating session', details: err });
  }
});

/**
 * Obtener el último QR generado
 */
app.get('/qr/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessions[sessionId] || !sessions[sessionId].lastQr) {
    return res.status(404).json({ error: 'No QR available' });
  }
  res.json({ qr: sessions[sessionId].lastQr });
});

/**
 * Cerrar sesión manualmente
 */
app.get('/logout/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;
  if (sessions[sessionId]) {
    await sessions[sessionId].client.logout();
    delete sessions[sessionId];
    return res.json({ message: 'Session logged out' });
  }
  res.status(404).json({ error: 'No session found' });
});

app.listen(port, () => console.log(`🚀 Venom server running on port ${port}`));