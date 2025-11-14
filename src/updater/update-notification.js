// Sistema de notificação de atualizações para o renderer process
class UpdateNotification {
  constructor() {
    this.notification = null;
    this.updateInfo = null;
  }

  // Mostrar notificação de atualização disponível
  show(updateInfo) {
    this.updateInfo = updateInfo;
    this.createNotification();
  }

  // Criar elemento de notificação
  createNotification() {
    // Remover notificação existente
    this.hide();

    // Criar container da notificação
    this.notification = document.createElement('div');
    this.notification.className = 'update-notification';
    this.notification.innerHTML = `
      <div class="update-notification-content">
        <div class="update-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12c0 1-.6 3-1.5 4.5-.9 1.5-2.4 3-4.5 3.5-2.1.5-4.5 0-6.5-1.5s-3.5-4-3.5-6.5.6-3 1.5-4.5S9.4 4.5 11.5 4c2.1-.5 4.5 0 6.5 1.5s3.5 4 3.5 6.5z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div class="update-text">
          <div class="update-title">Nova versão disponível!</div>
          <div class="update-version">
            Versão ${this.updateInfo.latestVersion} está disponível
            <span class="current-version">(atual: ${this.updateInfo.currentVersion})</span>
          </div>
        </div>
        <div class="update-actions">
          <button class="btn-update" onclick="updateNotification.startUpdate()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Atualizar
          </button>
          <button class="btn-later" onclick="updateNotification.hide()">Depois</button>
          <button class="btn-details" onclick="updateNotification.showDetails()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="m9,12 2,2 4,-4"/>
            </svg>
          </button>
        </div>
      </div>
      <button class="btn-close" onclick="updateNotification.hide()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    // Adicionar estilos
    this.addStyles();

    // Adicionar ao DOM
    document.body.appendChild(this.notification);

    // Animar entrada
    setTimeout(() => {
      this.notification.classList.add('show');
    }, 100);

    // Auto-hide após 30 segundos
    setTimeout(() => {
      if (this.notification) {
        this.hide();
      }
    }, 30000);
  }

  // Adicionar estilos CSS
  addStyles() {
    if (document.getElementById('update-notification-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'update-notification-styles';
    styles.textContent = `
      .update-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #071d49 0%, #0a2d6e 100%);
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        padding: 20px;
        max-width: 400px;
        z-index: 10000;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
      }

      .update-notification.show {
        transform: translateX(0);
        opacity: 1;
      }

      .update-notification-content {
        display: flex;
        align-items: flex-start;
        gap: 15px;
      }

      .update-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #4ade80;
      }

      .update-text {
        flex: 1;
        min-width: 0;
      }

      .update-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
        color: white;
      }

      .update-version {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.4;
      }

      .current-version {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        display: block;
        margin-top: 2px;
      }

      .update-actions {
        display: flex;
        gap: 8px;
        margin-top: 15px;
        flex-wrap: wrap;
      }

      .update-actions button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-update {
        background: #4ade80;
        color: #065f46;
      }

      .btn-update:hover {
        background: #22c55e;
        transform: translateY(-1px);
      }

      .btn-later {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      .btn-later:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .btn-details {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
        padding: 8px;
      }

      .btn-details:hover {
        background: rgba(59, 130, 246, 0.3);
      }

      .btn-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .btn-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      /* Animação de progresso */
      .update-notification.downloading .update-title::after {
        content: '';
        display: inline-block;
        width: 12px;
        height: 12px;
        margin-left: 8px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Responsivo */
      @media (max-width: 480px) {
        .update-notification {
          left: 20px;
          right: 20px;
          max-width: none;
        }
        
        .update-actions {
          flex-direction: column;
        }
        
        .update-actions button {
          width: 100%;
          justify-content: center;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  // Esconder notificação
  hide() {
    if (this.notification) {
      this.notification.classList.remove('show');
      setTimeout(() => {
        if (this.notification && this.notification.parentNode) {
          this.notification.parentNode.removeChild(this.notification);
        }
        this.notification = null;
      }, 300);
    }
  }

  // Iniciar atualização
  startUpdate() {
    if (this.updateInfo) {
      // Mostrar estado de download
      this.notification.classList.add('downloading');
      const title = this.notification.querySelector('.update-title');
      title.textContent = 'Baixando atualização...';
      
      const actions = this.notification.querySelector('.update-actions');
      actions.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; color: rgba(255, 255, 255, 0.8);">
          <div class="progress-bar" style="flex: 1; height: 4px; background: rgba(255, 255, 255, 0.2); border-radius: 2px; overflow: hidden;">
            <div class="progress-fill" style="height: 100%; background: #4ade80; width: 0%; transition: width 0.3s;"></div>
          </div>
          <span class="progress-text">0%</span>
        </div>
      `;

      // Comunicar com o main process
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('start-update', this.updateInfo);
      }
    }
  }

  // Atualizar progresso
  updateProgress(progress) {
    if (this.notification) {
      const progressFill = this.notification.querySelector('.progress-fill');
      const progressText = this.notification.querySelector('.progress-text');
      
      if (progressFill) progressFill.style.width = progress + '%';
      if (progressText) progressText.textContent = progress + '%';
    }
  }

  // Mostrar detalhes da atualização
  showDetails() {
    if (this.updateInfo && this.updateInfo.releaseNotes) {
      // Criar modal com detalhes
      const modal = document.createElement('div');
      modal.className = 'update-details-modal';
      modal.innerHTML = `
        <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Novidades da Versão ${this.updateInfo.latestVersion}</h3>
            <button onclick="this.closest('.update-details-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="release-notes">${this.formatReleaseNotes(this.updateInfo.releaseNotes)}</div>
          </div>
          <div class="modal-footer">
            <button class="btn-update" onclick="updateNotification.startUpdate(); this.closest('.update-details-modal').remove();">
              Atualizar Agora
            </button>
            <button onclick="this.closest('.update-details-modal').remove()">Fechar</button>
          </div>
        </div>
      `;

      // Adicionar estilos do modal
      this.addModalStyles();
      document.body.appendChild(modal);
    }
  }

  // Formatar notas de release
  formatReleaseNotes(notes) {
    if (!notes) return '<p>Nenhuma informação disponível.</p>';
    
    // Converter markdown básico para HTML
    return notes
      .replace(/^### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/^# (.*$)/gim, '<h2>$1</h2>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gim, '<p>$1</p>')
      .replace(/<p><li>/g, '<ul><li>')
      .replace(/<\/li><\/p>/g, '</li></ul>');
  }

  // Adicionar estilos do modal
  addModalStyles() {
    if (document.getElementById('update-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'update-modal-styles';
    styles.textContent = `
      .update-details-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .modal-content {
        background: white;
        border-radius: 12px;
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        overflow: hidden;
        position: relative;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }

      .modal-header {
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f9fafb;
      }

      .modal-header h3 {
        margin: 0;
        color: #111827;
        font-size: 18px;
      }

      .modal-header button {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
      }

      .modal-header button:hover {
        background: #e5e7eb;
      }

      .modal-body {
        padding: 20px;
        max-height: 400px;
        overflow-y: auto;
      }

      .release-notes {
        color: #374151;
        line-height: 1.6;
      }

      .release-notes h2, .release-notes h3, .release-notes h4 {
        color: #111827;
        margin-top: 20px;
        margin-bottom: 10px;
      }

      .release-notes ul {
        padding-left: 20px;
      }

      .release-notes li {
        margin-bottom: 5px;
      }

      .modal-footer {
        padding: 20px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        background: #f9fafb;
      }

      .modal-footer button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .modal-footer .btn-update {
        background: #4ade80;
        color: #065f46;
      }

      .modal-footer .btn-update:hover {
        background: #22c55e;
      }

      .modal-footer button:not(.btn-update) {
        background: #e5e7eb;
        color: #374151;
      }

      .modal-footer button:not(.btn-update):hover {
        background: #d1d5db;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Instância global
const updateNotification = new UpdateNotification();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UpdateNotification;
}
