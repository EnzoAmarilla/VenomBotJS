const venom = require('venom-bot');

venom
  .create({
    session: 'test-session',
    multidevice: true, // MUY importante para compatibilidad
    headless: true,
  })
  .then((client) => {
    console.log('✅ Bot conectado, listo para enviar mensajes');
    start(client);
  })
  .catch((err) => console.error('❌ Error al iniciar Venom:', err));

async function start(client) {
  try {
    // número de prueba
    const to = '5493484699717@c.us';
    const msg = 'Hola 👋, mensaje de prueba desde Venom en EC2';

    const state = await client.getConnectionState();
    console.log('📡 Estado actual:', state);

    if (state !== 'CONNECTED') {
      console.log('⚠️ Todavía no conectado, esperando...');
      return;
    }

    await client.sendText(to, msg);
    console.log('✅ Mensaje enviado correctamente');
  } catch (err) {
    console.error('❌ Error enviando mensaje:', err);
  }
}