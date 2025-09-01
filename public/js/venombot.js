    const socket = io();
    const sessionId = "profesional_2"; // 👉 cámbialo dinámicamente según login

    let isConnected = false;

    // ====== Referencias al DOM ======
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    const qrContainer = document.getElementById('qrContainer');
    const qrStatus = document.getElementById('qrStatus');
    const attemptCount = document.getElementById('attemptCount');
    const messagesContainer = document.getElementById('messagesContainer');
    const phoneInput = document.getElementById('phoneInput');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    // ================================
    // INICIAR SESIÓN
    // ================================
    async function iniciarSesion() {
      try {
        const res = await fetch('/api/start-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        const data = await res.json();
        console.log("🚀 Sesión iniciada:", data);
      } catch (err) {
        console.error("❌ Error al iniciar sesión:", err);
      }
    }
    iniciarSesion();

    // ================================
    // SOCKET.IO EVENTOS
    // ================================
    socket.on('qrCode', (data) => {
      if (data.sessionId !== sessionId) return;
      displayQRCode(data.qr, data.attempts);
    });

    socket.on('sessionStatus', (data) => {
      if (data.sessionId !== sessionId) return;
      updateStatus(data.status, data.isConnected);
    });

    socket.on('connected', (data) => {
      if (data.sessionId !== sessionId) return;
      isConnected = true;
      updateStatus('isLogged', true);
      hideQRCode();
      addSystemMessage('✅ WhatsApp conectado exitosamente!', 'success');
      enableControls();
    });

    socket.on('messageReceived', (data) => {
      if (data.sessionId !== sessionId) return;
      addReceivedMessage(data);
    });

    socket.on('error', (data) => {
      if (data.sessionId !== sessionId) return;
      addSystemMessage(`❌ Error: ${data.message}`, 'error');
    });

    // ================================
    // FUNCIONES DE UI
    // ================================
    function displayQRCode(qrData, attempts) {
      qrContainer.innerHTML = `<img src="${qrData}" alt="Código QR" class="qr-code">`;
      qrStatus.textContent = `📱 Escanea este código QR con WhatsApp`;
      attemptCount.textContent = `Intento: ${attempts}`;
    }

    function hideQRCode() {
      qrContainer.innerHTML = `
        <div class="qr-placeholder">
          <div>
            <div style="font-size: 2em; margin-bottom: 10px;">✅</div>
            <div>WhatsApp conectado</div>
          </div>
        </div>
      `;
      qrStatus.textContent = `✅ WhatsApp conectado exitosamente`;
      attemptCount.textContent = '';
    }

    function updateStatus(status, connected) {
      const statusMessages = {
        'isLogged': '✅ WhatsApp conectado',
        'notLogged': '🔄 Esperando escaneo de QR',
        'qrReadSuccess': '✅ QR escaneado exitosamente',
        'qrReadFail': '❌ Error al leer QR',
        'browserClose': '❌ Navegador cerrado',
        'chatsAvailable': '✅ Chats disponibles',
        'initBrowser': '🌐 Iniciando navegador...',
        'initWhatsapp': '📱 Iniciando WhatsApp...',
        'successPageWhatsapp': '✅ Página de WhatsApp cargada'
      };

      const message = statusMessages[status] || `🔄 ${status}`;
      statusText.textContent = message;

      if (connected) {
        statusBar.className = 'status-bar status-connected';
        isConnected = true;
      } else if (status.includes('error') || status.includes('fail') || status.includes('Close')) {
        statusBar.className = 'status-bar status-error';
        isConnected = false;
      } else {
        statusBar.className = 'status-bar';
        isConnected = false;
      }
    }

    function addSystemMessage(message, type = 'info') {
      const messageDiv = document.createElement('div');
      messageDiv.className = `${type}-card`;
      messageDiv.innerHTML = `<strong>${new Date().toLocaleTimeString()}</strong><br>${message}`;
      messagesContainer.appendChild(messageDiv);
      scrollToBottom();
    }

    function addReceivedMessage(data) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message message-received';
      messageDiv.innerHTML = `
        <strong>📨 Mensaje recibido</strong><br>
        <strong>De:</strong> ${data.from}<br>
        <strong>Mensaje:</strong> ${data.body}<br>
        <div class="message-time">${data.timestamp}</div>
      `;
      messagesContainer.appendChild(messageDiv);
      scrollToBottom();
    }

    function scrollToBottom() {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function enableControls() {
      phoneInput.disabled = false;
      messageInput.disabled = false;
      sendButton.disabled = false;
    }

    // ================================
    // ENVIAR MENSAJE MANUAL
    // ================================
    async function sendManualMessage() {
      const phone = phoneInput.value.trim();
      const message = messageInput.value.trim();

      if (!phone || !message) {
        alert('Por favor completa el número y el mensaje');
        return;
      }

      if (!isConnected) {
        alert('WhatsApp no está conectado');
        return;
      }

      try {
        const response = await fetch('/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, to: phone, message })
        });
        const result = await response.json();

        if (result.success) {
          addSystemMessage(`✅ Mensaje enviado a ${phone}: ${message}`, 'success');
          messageInput.value = '';
        } else {
          addSystemMessage(`❌ Error al enviar mensaje: ${result.error}`, 'error');
        }
      } catch (error) {
        addSystemMessage(`❌ Error de red: ${error.message}`, 'error');
      }
    }