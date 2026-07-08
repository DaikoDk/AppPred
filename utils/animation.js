"use strict";

/**
 * Utilidades de animación y UI para el frontend
 */

// Clase para manejo de notificaciones toast
class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 350px;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${this.getColor(type)};
            color: white;
            padding: 14px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
            min-width: 280px;
            max-width: 100%;
        `;

        const icon = this.getIcon(type);
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message" style="flex: 1;">${message}</span>
            <button class="toast-close" style="
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            ">&times;</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.onclick = () => this.remove(toast);

        this.container.appendChild(toast);

        // Auto-remove
        setTimeout(() => this.remove(toast), duration);

        return toast;
    }

    remove(toast) {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }

    success(msg, dur) { return this.show(msg, 'success', dur); }
    error(msg, dur) { return this.show(msg, 'error', dur); }
    warning(msg, dur) { return this.show(msg, 'warning', dur); }
    info(msg, dur) { return this.show(msg, 'info', dur); }

    getColor(type) {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        return colors[type] || colors.info;
    }

    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
}

// Clase para loading spinner
class LoadingManager {
    constructor() {
        this.overlay = null;
        this.count = 0;
    }

    show(message = 'Cargando...') {
        this.count++;
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'loading-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        `;

        this.overlay.innerHTML = `
            <div style="
                background: white;
                padding: 30px 40px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            ">
                <div class="spinner" style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #ecf0f1;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                "></div>
                <p style="margin: 0; color: #2c3e50; font-size: 16px;">${message}</p>
            </div>
        `;

        document.body.appendChild(this.overlay);
    }

    hide() {
        this.count = Math.max(0, this.count - 1);
        if (this.count === 0 && this.overlay) {
            this.overlay.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => {
                this.overlay.remove();
                this.overlay = null;
            }, 200);
        }
    }
}

// Utilidades de animación CSS (inyectar al DOM)
function injectAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); opacity: 1; }
        }
        .animate-pulse { animation: pulse 2s infinite; }
        .animate-bounce { animation: bounceIn 0.5s ease-out; }
    `;
    document.head.appendChild(style);
}

// Utilidad para transiciones suaves de elementos
function animateElement(element, animationClass, duration = 300) {
    return new Promise(resolve => {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
            resolve();
        }, duration);
    }
}

// Transiciones de página
function transitionPage(fromPage, toPage) {
    return new Promise(resolve => {
        fromPage.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(() => {
            fromPage.style.display = 'none';
            toPage.style.display = 'block';
            toPage.style.animation = 'fadeIn 0.2s ease forwards';
            resolve();
        }, 200);
    });
}

// Modal manager
class ModalManager {
    constructor() {
        this.currentModal = null;
    }

    show(content, options = {}) {
        const { title = '', size = 'md', closable = true, onClose } = options;

        // Cerrar modal anterior si existe
        if (this.currentModal) this.hide();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        `;

        const sizes = {
            sm: '400px',
            md: '600px',
            lg: '800px',
            xl: '90%',
            full: '95%'
        };

        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                width: ${sizes[size] || '600px'};
                max-width: 95%;
                max-height: 90vh;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                overflow: hidden;
                animation: slideUp 0.3s ease;
            ">
                ${title ? `
                    <div class="modal-header" style="
                        padding: 20px 24px;
                        border-bottom: 1px solid #ecf0f1;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h3 style="margin: 0; color: #2c3e50;">${title}</h3>
                        ${closable ? `
                            <button class="modal-close" style="
                                background: none;
                                border: none;
                                font-size: 24px;
                                color: #95a5a6;
                                cursor: pointer;
                                padding: 4px;
                                line-height: 1;
                            ">&times;</button>
                        ` : ''}
                    </div>
                ` : ''}
                <div class="modal-body" style="padding: 24px; overflow-y: auto; max-height: 70vh;">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.currentModal = modal;

        // Event listeners
        if (closable) {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) closeBtn.onclick = () => this.hide();
            modal.onclick = (e) => { if (e.target === modal) this.hide(); };
        }

        // Escape key
        const escHandler = (e) => { if (e.key === 'Escape') this.hide(); };
        document.addEventListener('keydown', escHandler);
        modal._escHandler = escHandler;

        return modal;
    }

    hide() {
        if (this.currentModal) {
            this.currentModal.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => {
                document.removeEventListener('keydown', this.currentModal._escHandler);
                this.currentModal.remove();
                this.currentModal = null;
            }, 200);
        }
    }
}

// Confirm dialog simplificado
function confirmDialog(message, title = 'Confirmar') {
    return new Promise(resolve => {
        const modal = new ModalManager();
        modal.show(`
            <p style="margin: 0 0 24px; color: #2c3e50; font-size: 16px;">${message}</p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="btn btn-secondary" id="btn-cancel">Cancelar</button>
                <button class="btn btn-primary" id="btn-confirm">Confirmar</button>
            </div>
        `, { title });

        document.getElementById('btn-confirm').onclick = () => {
            modal.hide();
            resolve(true);
        };
        document.getElementById('btn-cancel').onclick = () => {
            modal.hide();
            resolve(false);
        };
    });
}

// Inicializar estilos al cargar
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        injectAnimationStyles();
        window.toast = new ToastManager();
        window.loading = new LoadingManager();
        window.modal = new ModalManager();
        window.confirm = confirmDialog;
    });
}

module.exports = {
    ToastManager,
    LoadingManager,
    ModalManager,
    injectAnimationStyles,
    animateElement,
    transitionPage,
    confirmDialog
};