// Gerenciamento centralizado de estado
export class AppStore {
    constructor() {
        this.state = this.getInitialState();
        this.editingIds = {
            customer: null,
            product: null,
            ingredient: null,
            motoboy: null,
            employee: null
        };
        this.confirmAction = null;
        this.listeners = [];
    }

    getInitialState() {
        return {
            isInitialized: false,
            viewMode: 'empresa',
            notifications: [],
            hasUnreadNotifications: false,
            
            // Dados
            currentUser: null,
            customers: [],
            products: [],
            orders: [],
            orderItems: [],
            expenses: [],
            personalIncomes: [],
            motoboys: [],
            ingredients: [],
            productIngredients: [],
            cashSessions: [],
            employees: [],
            
            // Estado do caixa
            activeCashSession: null,
            
            // Estado do pedido atual
            editingOrderId: null,
            currentOrder: this.getInitialOrderState(),
            
            // Estado de importação
            importedImageData: null,
            currentImportType: null,
            scannedProducts: [],
            
            // Estado do formulário de produto
            productFormImageFile: null,
            
            // Estado do chat
            isChatOpen: false,
            chatHistory: [],
            
            // Estado de autenticação
            isLoginView: true,
            
            // Paginação
            sessionOrdersCurrentPage: 1
        };
    }

    getInitialOrderState() {
        return {
            customer_id: null,
            items: [],
            total: 0,
            payment_method: 'Dinheiro',
            status: 'Pendente',
            is_delivery: false,
            notes: '',
            delivery_cost: 0,
            step: 1,
            is_internal_consumption: false
        };
    }

    resetCurrentOrder() {
        this.state.editingOrderId = null;
        this.state.currentOrder = this.getInitialOrderState();
        this.notify('orderReset');
    }

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notify('stateUpdate', updates);
    }

    updateState(key, value) {
        this.state[key] = value;
        this.notify('stateUpdate', { [key]: value });
    }

    getState() {
        return this.state;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data, this.state);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    setEditingId(entity, id) {
        this.editingIds[entity] = id;
        this.notify('editingIdChanged', { entity, id });
    }

    getEditingId(entity) {
        return this.editingIds[entity];
    }

    clearEditingId(entity) {
        this.editingIds[entity] = null;
        this.notify('editingIdCleared', { entity });
    }

    // Métodos de conveniência
    get currentUser() {
        return this.state.currentUser;
    }

    get viewMode() {
        return this.state.viewMode;
    }

    get activeCashSession() {
        return this.state.activeCashSession;
    }
}
