// EventBus - Sistema de comunicação entre módulos
export class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Registra um listener para um evento
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
        
        // Retorna função para remover o listener
        return () => this.off(event, callback);
    }

    /**
     * Registra um listener que será executado apenas uma vez
     */
    once(event, callback) {
        const onceCallback = (...args) => {
            callback(...args);
            this.off(event, onceCallback);
        };
        
        return this.on(event, onceCallback);
    }

    /**
     * Remove um listener de um evento
     */
    off(event, callback) {
        if (!this.events.has(event)) return;
        
        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);
        
        if (index > -1) {
            callbacks.splice(index, 1);
        }
        
        // Remove o evento se não houver mais listeners
        if (callbacks.length === 0) {
            this.events.delete(event);
        }
    }

    /**
     * Emite um evento para todos os listeners
     */
    emit(event, data) {
        if (!this.events.has(event)) return;
        
        const callbacks = this.events.get(event);
        
        // Executar callbacks em ordem
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Erro no evento ${event}:`, error);
            }
        });
    }

    /**
     * Remove todos os listeners
     */
    clear() {
        this.events.clear();
    }

    /**
     * Remove todos os listeners de um evento específico
     */
    clearEvent(event) {
        this.events.delete(event);
    }

    /**
     * Retorna quantidade de listeners de um evento
     */
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }

    /**
     * Retorna todos os eventos registrados
     */
    eventNames() {
        return Array.from(this.events.keys());
    }
}

// Singleton global (opcional)
export const globalEventBus = new EventBus();
