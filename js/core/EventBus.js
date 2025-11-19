/**
 * EventBus - Sistema de comunicação entre componentes
 * Implementa padrão Pub/Sub para desacoplamento
 */
export class EventBus {
  constructor() {
    this._events = new Map();
  }

  /**
   * Registra um listener para um evento
   */
  on(event, callback) {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event).push(callback);

    // Retorna função para remover o listener
    return () => this.off(event, callback);
  }

  /**
   * Remove um listener específico
   */
  off(event, callback) {
    if (!this._events.has(event)) return;
    
    const callbacks = this._events.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emite um evento
   */
  emit(event, ...args) {
    if (!this._events.has(event)) return;
    
    this._events.get(event).forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Erro ao processar evento ${event}:`, error);
      }
    });
  }

  /**
   * Registra um listener que será executado apenas uma vez
   */
  once(event, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Remove todos os listeners de um evento
   */
  clear(event) {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
  }
}

// Instância global do EventBus
export const eventBus = new EventBus();
