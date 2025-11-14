// Cliente de atualizações para o renderer process
// Este arquivo deve ser incluído nas páginas HTML da aplicação

(function() {
  'use strict';

  // Verificar se estamos no renderer process do Electron
  if (typeof window === 'undefined' || !window.require) {
    console.warn('Update client só funciona no renderer process do Electron');
    return;
  }

  const { ipcRenderer } = window.require('electron');
  
  // Instância da notificação
  let updateNotification = null;

  // Inicializar quando o DOM estiver pronto
  function initializeUpdateClient() {
    console.log(' Inicializando cliente de atualizações...');

    // Carregar o módulo de notificação
    loadUpdateNotification();

    // Configurar listeners dos eventos do main process
    setupIpcListeners();

    // Adicionar botão de verificação manual (opcional)
    addUpdateButton();

    console.log(' Cliente de atualizações inicializado');
  }

  // Carregar módulo de notificação
  function loadUpdateNotification() {
    try {
      // Carregar o script de notificação se não estiver carregado
      if (typeof window.UpdateNotification === 'undefined') {
        const script = document.createElement('script');
        script.src = './updater/update-notification.js';
        script.onload = () => {
          updateNotification = new window.UpdateNotification();
          console.log(' Módulo de notificação carregado');
        };
        document.head.appendChild(script);
      } else {
        updateNotification = new window.UpdateNotification();
      }
    } catch (error) {
      console.error(' Erro ao carregar notificação:', error);
    }
  }

  // Configurar listeners dos eventos IPC
  function setupIpcListeners() {
    // Atualização disponível
    ipcRenderer.on('update-available', (event, updateInfo) => {
      console.log(' Atualização disponível recebida:', updateInfo);
      if (updateNotification) {
        updateNotification.show(updateInfo);
      } else {
        // Fallback: mostrar alerta simples
        showSimpleUpdateAlert(updateInfo);
      }
    });

    // Download em progresso
    ipcRenderer.on('update-downloading', () => {
      console.log(' Download iniciado');
      if (updateNotification) {
        // A notificação já mostra o estado de download
      }
    });

    // Progresso do download
    ipcRenderer.on('download-progress', (event, progress) => {
      console.log(` Progresso: ${progress}%`);
      if (updateNotification) {
        updateNotification.updateProgress(progress);
      }
    });

    // Download concluído
    ipcRenderer.on('update-downloaded', (event, filePath) => {
      console.log(' Download concluído:', filePath);
      showDownloadCompleteNotification();
    });

    // Erro na atualização
    ipcRenderer.on('update-error', (event, error) => {
      console.error(' Erro na atualização:', error);
      showUpdateError(error);
    });
  }

  // Mostrar alerta simples (fallback)
  function showSimpleUpdateAlert(updateInfo) {
    const message = `Nova versão disponível: ${updateInfo.latestVersion}\n` +
                   `Versão atual: ${updateInfo.currentVersion}\n\n` +
                   `Deseja atualizar agora?`;
    
    if (confirm(message)) {
      ipcRenderer.send('start-update', updateInfo);
    }
  }

  // Mostrar notificação de download concluído
  function showDownloadCompleteNotification() {
    // Criar notificação de sucesso
    const notification = document.createElement('div');
    notification.className = 'update-success-notification';
    notification.innerHTML = `
      <div class="success-content">
        <div class="success-icon"></div>
        <div class="success-text">
          <div class="success-title">Atualização baixada!</div>
          <div class="success-message">A instalação será iniciada automaticamente.</div>
        </div>
      </div>
    `;

    // Adicionar estilos
    const styles = document.createElement('style');
    styles.textContent = `
      .update-success-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
      }

      .success-content {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .success-icon {
        font-size: 24px;
      }

      .success-title {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .success-message {
        font-size: 14px;
        opacity: 0.9;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(notification);

    // Remover após 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  // Mostrar erro de atualização
  function showUpdateError(error) {
    const notification = document.createElement('div');
    notification.className = 'update-error-notification';
    notification.innerHTML = `
      <div class="error-content">
        <div class="error-icon"></div>
        <div class="error-text">
          <div class="error-title">Erro na atualização</div>
          <div class="error-message">${error}</div>
        </div>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Adicionar estilos
    const styles = document.createElement('style');
    styles.textContent = `
      .update-error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
      }

      .error-content {
        display: flex;
        align-items: flex-start;
        gap: 15px;
        position: relative;
      }

      .error-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .error-title {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .error-message {
        font-size: 14px;
        opacity: 0.9;
        word-break: break-word;
      }

      .error-close {
        position: absolute;
        top: -5px;
        right: -5px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .error-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(notification);

    // Remover após 10 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  }

  // Adicionar botão de verificação manual (opcional)
  function addUpdateButton() {
    // Verificar se já existe
    if (document.getElementById('manual-update-btn')) return;

    // Criar botão discreto no canto inferior direito
    const button = document.createElement('button');
    button.id = 'manual-update-btn';
    button.title = 'Verificar atualizações';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12c0 1-.6 3-1.5 4.5-.9 1.5-2.4 3-4.5 3.5-2.1.5-4.5 0-6.5-1.5s-3.5-4-3.5-6.5.6-3 1.5-4.5S9.4 4.5 11.5 4c2.1-.5 4.5 0 6.5 1.5s3.5 4 3.5 6.5z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    `;

    // Estilos do botão
    const buttonStyles = `
      #manual-update-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
        background: rgba(7, 29, 73, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transition: all 0.2s;
        z-index: 1000;
        backdrop-filter: blur(10px);
      }

      #manual-update-btn:hover {
        background: rgba(10, 45, 110, 0.9);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
      }

      #manual-update-btn:active {
        transform: translateY(0);
      }

      #manual-update-btn.checking {
        animation: pulse 1.5s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
    `;

    // Adicionar estilos
    const styles = document.createElement('style');
    styles.textContent = buttonStyles;
    document.head.appendChild(styles);

    // Adicionar evento de clique
    button.addEventListener('click', async () => {
      button.classList.add('checking');
      button.title = 'Verificando atualizações...';
      
      try {
        const hasUpdate = await ipcRenderer.invoke('check-for-updates');
        if (!hasUpdate) {
          showNoUpdateNotification();
        }
      } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
        showUpdateError('Erro ao verificar atualizações');
      } finally {
        button.classList.remove('checking');
        button.title = 'Verificar atualizações';
      }
    });

    document.body.appendChild(button);
  }

  // Mostrar notificação de "sem atualizações"
  function showNoUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'no-update-notification';
    notification.innerHTML = `
      <div class="no-update-content">
        <div class="no-update-icon"></div>
        <div class="no-update-text">
          <div class="no-update-title">Tudo em dia!</div>
          <div class="no-update-message">Você já tem a versão mais recente.</div>
        </div>
      </div>
    `;

    // Estilos
    const styles = document.createElement('style');
    styles.textContent = `
      .no-update-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        color: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 10px 30px rgba(107, 114, 128, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
      }

      .no-update-content {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .no-update-icon {
        font-size: 24px;
      }

      .no-update-title {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .no-update-message {
        font-size: 14px;
        opacity: 0.9;
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(notification);

    // Remover após 3 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUpdateClient);
  } else {
    initializeUpdateClient();
  }

  // Expor funções globais para uso manual
  window.updateClient = {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
  };

})();
