// Custom Alert System
class CustomAlert {
    constructor() {
        this.overlay = null;
        this.createOverlay();
    }

    createOverlay() {
        if (document.getElementById('customAlertOverlay')) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'customAlertOverlay';
        this.overlay.className = 'custom-alert-overlay';
        document.body.appendChild(this.overlay);
    }

    show(options) {
        const {
            title = 'Aviso',
            message = '',
            type = 'info', // success, error, warning, info
            confirmText = 'OK',
            cancelText = null,
            onConfirm = null,
            onCancel = null
        } = options;

        // Icon based on type
        const icons = {
            success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>`,
            error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`,
            warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`,
            info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>`
        };

        const alertBox = document.createElement('div');
        alertBox.className = `custom-alert-box ${type}`;
        alertBox.innerHTML = `
            <div class="custom-alert-header">
                <div class="custom-alert-icon">
                    ${icons[type] || icons.info}
                </div>
                <h3 class="custom-alert-title">${title}</h3>
            </div>
            <div class="custom-alert-body">
                <p class="custom-alert-message">${message}</p>
            </div>
            <div class="custom-alert-footer">
                ${cancelText ? `<button class="custom-alert-btn custom-alert-btn-secondary" data-action="cancel">${cancelText}</button>` : ''}
                <button class="custom-alert-btn custom-alert-btn-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'}" data-action="confirm">${confirmText}</button>
            </div>
        `;

        // Clear previous content
        this.overlay.innerHTML = '';
        this.overlay.appendChild(alertBox);
        this.overlay.classList.add('active');

        // Event listeners
        const confirmBtn = alertBox.querySelector('[data-action="confirm"]');
        const cancelBtn = alertBox.querySelector('[data-action="cancel"]');

        const close = () => {
            this.overlay.classList.remove('active');
        };

        confirmBtn.addEventListener('click', () => {
            close();
            if (onConfirm) onConfirm();
        });

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                close();
                if (onCancel) onCancel();
            });
        }

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                close();
                if (onCancel) onCancel();
            }
        });

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                close();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    success(message, title = 'Sucesso!') {
        this.show({
            title,
            message,
            type: 'success',
            confirmText: 'OK'
        });
    }

    error(message, title = 'Erro!') {
        this.show({
            title,
            message,
            type: 'error',
            confirmText: 'OK'
        });
    }

    warning(message, title = 'Atenção!') {
        this.show({
            title,
            message,
            type: 'warning',
            confirmText: 'OK'
        });
    }

    info(message, title = 'Informação') {
        this.show({
            title,
            message,
            type: 'info',
            confirmText: 'OK'
        });
    }

    confirm(message, onConfirm, onCancel, title = 'Confirmação') {
        this.show({
            title,
            message,
            type: 'warning',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            onConfirm,
            onCancel
        });
    }
}

// Create global instance
window.customAlert = new CustomAlert();
