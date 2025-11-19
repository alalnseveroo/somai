// Utilitários de interface do usuário
export class UIHelpers {
    constructor() {
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.toast = document.getElementById('toast');
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            // Usar setTimeout para garantir que a transição seja visível
            setTimeout(() => {
                this.loadingOverlay.classList.add('hidden');
            }, 200);
        }
    }

    showToast(message, isError = false) {
        if (!this.toast) return;
        
        this.toast.querySelector('p').textContent = message;
        this.toast.className = 'toast fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-xl z-50';
        this.toast.classList.add(isError ? 'bg-red-500' : 'bg-green-600');
        this.toast.classList.remove('hidden');
        
        setTimeout(() => this.toast.classList.add('hidden'), 4000);
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal-container');
        modals.forEach(modal => {
            modal.classList.remove('open');
            modal.classList.add('opacity-0', 'pointer-events-none');
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.classList.remove('open');
                content.classList.add('scale-95', 'opacity-0');
            }
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('open');
            modal.classList.remove('opacity-0', 'pointer-events-none');
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.classList.add('open');
                content.classList.remove('scale-95', 'opacity-0');
            }
        }
    }

    showSaleNotification(value, formatCurrency) {
        const notification = document.getElementById('sale-notification');
        const saleValueEl = document.getElementById('sale-value');
        
        if (!notification || !saleValueEl) return;
        
        saleValueEl.textContent = `+ ${formatCurrency(value)}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}