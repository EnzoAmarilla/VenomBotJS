# 🕷️ Venom Bot Demo - WhatsApp Bot Simple

Este es un proyecto de demostración que muestra cómo usar **Venom Bot** para crear un bot de WhatsApp con respuestas automáticas y un frontend simple.

## 🚀 Características

- ✅ **Conexión automática** a WhatsApp mediante código QR
- ✅ **Respuestas automáticas** a mensajes específicos
- ✅ **Frontend en tiempo real** para ver mensajes y estado
- ✅ **Interfaz web simple** para monitorear el bot
- ✅ **Comandos básicos** predefinidos

## 📋 Comandos del Bot

El bot responde automáticamente a estos comandos:

- `hola` / `hello` / `hi` → Saludo de bienvenida
- `info` / `información` → Información sobre el bot
- `hora` / `time` → Hora actual
- `ayuda` / `help` → Lista de comandos disponibles
- Cualquier otro mensaje → Respuesta genérica con el comando "ayuda"

## 🛠️ Instalación y Configuración

### 1. Instalar dependencias

Ejecuta este comando en la terminal para instalar todas las dependencias:

\`\`\`bash
npm install
\`\`\`

### 2. Iniciar el servidor

\`\`\`bash
npm start
\`\`\`

### 3. Abrir en el navegador

Abre tu navegador y ve a: **http://localhost:3000**

## 📱 Cómo usar el bot

1. **Inicia el servidor** con `npm start`
2. **Abre el navegador** en `http://localhost:3000`
3. **Escanea el QR** que aparece en la página web con tu WhatsApp
4. **¡Listo!** El bot está conectado y funcionando

### Prueba el bot:

1. Desde otro WhatsApp, envía un mensaje al número que conectaste
2. Prueba enviando: `hola`, `info`, `hora`, o `ayuda`
3. El bot responderá automáticamente
4. Puedes ver todos los mensajes en tiempo real en la interfaz web

## 🔧 Configuración Avanzada

### Modificar respuestas automáticas

Edita el archivo `index.js` en la función `manejarRespuestaAutomatica()` para agregar más comandos:

\`\`\`javascript
switch (textoMensaje) {
  case 'nuevo-comando':
    respuesta = 'Tu nueva respuesta aquí';
    break;
  // ... más comandos
}
\`\`\`

### Cambiar puerto

Modifica la variable `PORT` en `index.js` o usa una variable de entorno:

\`\`\`bash
PORT=8080 npm start
\`\`\`

### Modo desarrollo (ver navegador)

Cambia `headless: true` a `headless: false` en `index.js` para ver el navegador de Chrome abierto.

## 📁 Estructura del Proyecto

\`\`\`
venom-demo/
├── index.js          # Servidor principal con Venom Bot
├── package.json      # Dependencias del proyecto
├── README.md         # Este archivo
└── public/
    └── index.html    # Frontend de la aplicación
\`\`\`

## 🌐 Funcionalidades de la Interfaz Web

- **Estado en tiempo real** del bot (conectado/desconectado)
- **Código QR** para conectar WhatsApp
- **Chat en tiempo real** mostrando mensajes entrantes y respuestas
- **Envío manual** de mensajes (opcional)
- **Diseño responsive** que funciona en móvil y desktop

## ⚠️ Notas Importantes

1. **Solo mensajes privados**: El bot solo responde a mensajes directos, no a grupos
2. **Una sesión**: Solo puede estar conectado un WhatsApp a la vez
3. **Persistencia**: La sesión se guarda automáticamente para reconectar
4. **Términos de WhatsApp**: Úsalo responsablemente y respeta los términos de servicio

## 🔍 Resolución de Problemas

### El QR no aparece
- Verifica que todas las dependencias estén instaladas
- Revisa la consola del servidor para errores

### No recibe mensajes
- Asegúrate de que el QR fue escaneado correctamente
- Verifica que el estado sea "WhatsApp conectado"

### Error de conexión
- Reinicia el servidor con `npm start`
- Elimina la carpeta `tokens` si existe y vuelve a escanear el QR

## 📚 Tecnologías Utilizadas

- **Node.js** - Servidor backend
- **Venom Bot** - Librería para WhatsApp
- **Express** - Framework web
- **Socket.IO** - Comunicación en tiempo real
- **HTML/CSS/JavaScript** - Frontend simple

## 🤝 Contribuciones

Este es un proyecto de demostración. Siéntete libre de:

- Agregar más comandos
- Mejorar la interfaz
- Añadir funcionalidades
- Optimizar el código

¡Disfruta probando Venom Bot! 🕷️
