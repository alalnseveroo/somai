/**
 * Modal - Componente de modal reutilizável
 */
export class Modal {
  constructor() {
    this.modalElement = null;
    this.isOpen = false;
  }

  /**
   * Abre modal com conteúdo customizado
   */
  open(title, content, options = {}) {
    const {
      size = 'medium', // small, medium, large, full
      showCloseButton = true,
      onClose = null
    } = options;

    this.close(); // Fecha modal anterior se existir

    const sizeClasses = {
      small: 'max-w-md',
      medium: 'max-w-2xl',
      large: 'max-w-4xl',
      full: 'max-w-7xl'
    };

    const modalHTML = `
      <div id="modal-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-5">
        <div class="bg-white rounded-xl shadow-2xl ${sizeClasses[size]} w-full max-h-[calc(100vh-40px)] flex flex-col animate-fadeIn">
          <div class="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 class="text-xl font-bold text-slate-900">${title}</h2>
            ${showCloseButton ? `
              <button id="modal-close-btn" class="text-slate-400 hover:text-slate-600 transition-colors">
                <i data-lucide="x" class="w-6 h-6"></i>
              </button>
            ` : ''}
          </div>
          <div class="flex-1 overflow-y-auto p-6" id="modal-content">
            ${content}
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modalElement = document.getElementById('modal-overlay');
    this.isOpen = true;

    // Event listeners
    if (showCloseButton) {
      document.getElementById('modal-close-btn')?.addEventListener('click', () => {
        this.close();
        if (onClose) onClose();
      });
    }

    // Fechar ao clicar fora
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.close();
        if (onClose) onClose();
      }
    });

    // Renderizar ícones Lucide
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    return this;
  }

  /**
   * Fecha o modal
   */
  close() {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
      this.isOpen = false;
    }
  }

  /**
   * Atualiza o conteúdo do modal
   */
  updateContent(content) {
    const contentEl = document.getElementById('modal-content');
    if (contentEl) {
      contentEl.innerHTML = content;
      
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  }
}

// Instância global
export const modal = new Modal();
