const express = require('express');
const venom = require('venom-bot');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
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

// Variables globales
let client = null;
let qrCode = null;
let isConnected = false;
let sessionStatus = 'Iniciando...';

// Configuración de Venom Bot
const venomOptions = {
  session: 'mi-whatsapp-bot',
  headless: true, // Cambia a false si quieres ver el navegador
  useChrome: true,
  logQR: true,
  statusFind: (statusSession, session) => {
    console.log('Estado de sesión:', statusSession);
    sessionStatus = statusSession;
    
    // Emitir estado a todos los clientes conectados
    io.emit('sessionStatus', {
      status: statusSession,
      session: session,
      isConnected: statusSession === 'isLogged'
    });
  },
  catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
    console.log('Intento de QR:', attempts);
    qrCode = base64Qr;
    
    // Emitir QR a todos los clientes conectados
    io.emit('qrCode', {
      qr: base64Qr,
      attempts: attempts
    });
  }
};

// Función para inicializar Venom Bot
async function inicializarVenomBot() {
  try {
    console.log('🕷️ Iniciando Venom Bot...');
    
    client = await venom.create(venomOptions);
    
    console.log('✅ Venom Bot conectado exitosamente!');
    isConnected = true;
    
    // Emitir conexión exitosa
    io.emit('connected', { message: 'WhatsApp conectado exitosamente!' });
    
    // Configurar listeners de mensajes
    configurarListenersDeVenom();
    
  } catch (error) {
    console.error('❌ Error al inicializar Venom Bot:', error);
    io.emit('error', { message: 'Error al conectar con WhatsApp', error: error.message });
  }
}

// Configurar listeners de Venom
function configurarListenersDeVenom() {
  if (!client) return;

  // Escuchar mensajes entrantes
  client.onMessage(async (message) => {
    console.log('📨 Mensaje recibido:', message.body);
    console.log('👤 De:', message.from);
    console.log('🔍 Es grupo:', message.isGroupMsg);
    
    // Emitir mensaje recibido al frontend
    io.emit('messageReceived', {
      from: message.from,
      body: message.body,
      isGroup: message.isGroupMsg,
      timestamp: new Date().toLocaleString()
    });
    
    // Respuesta automática simple
    await manejarRespuestaAutomatica(message);
  });
  
  // Escuchar cambios de estado
  client.onStateChange((state) => {
    console.log('🔄 Estado cambiado:', state);
    io.emit('stateChange', { state });
  });
}

// Función para manejar respuestas automáticas
async function manejarRespuestaAutomatica(message) {
  // Solo responder a mensajes privados (no grupos)
  if (message.isGroupMsg) return;
  
  // No responder a mensajes del propio bot
  if (message.fromMe) return;
  
  try {
    let respuesta = '';
    const textoMensaje = message.body.toLowerCase().trim();
    
    // Respuestas automáticas simples
    switch (textoMensaje) {
      case 'hola':
      case 'hello':
      case 'hi':
        respuesta = '¡Hola! 👋 Soy un bot de WhatsApp creado con Venom Bot. ¿En qué puedo ayudarte?';
        break;
      
      case 'info':
      case 'información':
        respuesta = '🤖 Soy un bot de demostración creado con Venom Bot.\n\nComandos disponibles:\n• hola - Saludo\n• info - Información del bot\n• hora - Hora actual\n• ayuda - Lista de comandos';
        break;
      
      case 'hora':
      case 'time':
        respuesta = `🕐 La hora actual es: ${new Date().toLocaleString('es-ES')}`;
        break;
      
      case 'ayuda':
      case 'help':
        respuesta = '🆘 Comandos disponibles:\n\n• hola - Saludo\n• info - Información del bot\n• hora - Hora actual\n• ayuda - Esta lista de comandos\n\n¡Prueba escribiendo cualquiera de estos comandos!';
        break;
      
      default:
        respuesta = `📝 Recibí tu mensaje: "${message.body}"\n\n🤖 Soy un bot automático. Escribe "ayuda" para ver los comandos disponibles.`;
        break;
    }
    
    // Enviar respuesta
    const resultado = await client.sendText(message.from, respuesta);
    
    console.log('✅ Respuesta enviada:', respuesta);
    
    // Emitir respuesta enviada al frontend
    io.emit('messageSent', {
      to: message.from,
      message: respuesta,
      timestamp: new Date().toLocaleString(),
      success: true
    });
    
  } catch (error) {
    console.error('❌ Error al enviar respuesta automática:', error);
    
    io.emit('messageSent', {
      to: message.from,
      message: 'Error al enviar respuesta',
      timestamp: new Date().toLocaleString(),
      success: false,
      error: error.message
    });
  }
}

// Rutas de la API
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({
    isConnected,
    sessionStatus,
    hasClient: !!client,
    qrAvailable: !!qrCode
  });
});

app.post('/api/send-message', async (req, res) => {
  const { to, message } = req.body;
  
  if (!client || !isConnected) {
    return res.status(400).json({ 
      success: false, 
      error: 'WhatsApp no está conectado' 
    });
  }
  
  try {
    const result = await client.sendText(to, message);
    res.json({ 
      success: true, 
      message: 'Mensaje enviado correctamente',
      result 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // Enviar estado actual al cliente recién conectado
  socket.emit('sessionStatus', {
    status: sessionStatus,
    isConnected,
    hasClient: !!client
  });
  
  // Si hay un QR disponible, enviarlo
  if (qrCode) {
    socket.emit('qrCode', { qr: qrCode });
  }
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`🌐 Abre tu navegador en: http://localhost:${PORT}`);
  console.log('🕷️ Iniciando Venom Bot...\n');
  
  // Inicializar Venom Bot
  inicializarVenomBot();
});

// Manejar cierre de aplicación
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando aplicación...');
  
  if (client) {
    try {
      await client.close();
      console.log('✅ Venom Bot cerrado correctamente');
    } catch (error) {
      console.error('❌ Error al cerrar Venom Bot:', error);
    }
  }
  
  process.exit(0);
});
