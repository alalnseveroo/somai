/**
 * AppState - Gerenciador de estado global da aplicação
 * Implementa padrão Observer para reatividade
 */
export class AppState {
  constructor() {
    this._state = {
      // Auth
      isInitialized: false,
      currentUser: null,
      currentEmployee: null,
      isEmployee: false,
      ownerUserId: null,
      isLoginView: true,

      // View Mode
      viewMode: 'empresa',

      // Data
      customers: [],
      products: [],
      orders: [],
      expenses: [],
      personalIncomes: [],
      ingredients: [],
      productIngredients: [],
      orderItems: [],
      motoboys: [],
      cashSessions: [],
      employees: [],
      subscriptionPlan: null,
      
      // UI State
      notifications: [],
      hasUnreadNotifications: false,
      activeCashSession: null,
      editingOrderId: null,
      currentOrder: this._getDefaultOrder(),
      importedImageData: null,
      currentImportType: null,
      scannedProducts: [],
      isChatOpen: false,
      chatHistory: [],
      productFormImageFile: null,
      sessionOrdersCurrentPage: 1,
      editingId: { 
        customer: null, 
        product: null, 
        ingredient: null, 
        motoboy: null, 
        employee: null 
      },
      confirmAction: null
    };

    this._listeners = new Map();
  }

  _getDefaultOrder() {
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

  /**
   * Obtém o estado completo ou uma propriedade específica
   */
  get(path) {
    if (!path) return { ...this._state };
    
    const keys = path.split('.');
    let value = this._state;
    
    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }
    
    return value;
  }

  /**
   * Define o estado e notifica listeners
   */
  set(path, value) {
    if (typeof path === 'object') {
      // Merge múltiplos valores
      Object.assign(this._state, path);
      this._notify('*', this._state);
    } else {
      const keys = path.split('.');
      const lastKey = keys.pop();
      let target = this._state;

      for (const key of keys) {
        if (!(key in target)) target[key] = {};
        target = target[key];
      }

      const oldValue = target[lastKey];
      target[lastKey] = value;
      
      this._notify(path, value, oldValue);
    }
  }

  /**
   * Subscreve a mudanças no estado
   */
  subscribe(path, callback) {
    if (!this._listeners.has(path)) {
      this._listeners.set(path, []);
    }
    this._listeners.get(path).push(callback);

    // Retorna função para cancelar subscrição
    return () => {
      const listeners = this._listeners.get(path);
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  }

  /**
   * Notifica listeners sobre mudanças
   */
  _notify(path, value, oldValue) {
    // Notifica listeners específicos
    if (this._listeners.has(path)) {
      this._listeners.get(path).forEach(callback => {
        callback(value, oldValue);
      });
    }

    // Notifica listeners globais
    if (this._listeners.has('*')) {
      this._listeners.get('*').forEach(callback => {
        callback(this._state);
      });
    }
  }

  /**
   * Reseta o pedido atual
   */
  resetCurrentOrder() {
    this.set('currentOrder', this._getDefaultOrder());
    this.set('editingOrderId', null);
  }

  /**
   * Reseta o estado completo
   */
  reset() {
    const defaultState = new AppState()._state;
    this._state = defaultState;
    this._notify('*', this._state);
  }

  /**
   * Verifica se o usuário atual é barbeiro
   */
  isBarber() {
    const employees = this.get('employees') || [];
    const currentUser = this.get('currentUser');
    if (!currentUser) return false;
    
    const employee = employees.find(e => e.user_id === currentUser.id);
    return employee?.role === 'barbeiro';
  }

  /**
   * Verifica se o usuário atual é caixa
   */
  isCashier() {
    const employees = this.get('employees') || [];
    const currentUser = this.get('currentUser');
    if (!currentUser) return false;
    
    const employee = employees.find(e => e.user_id === currentUser.id);
    return employee?.role === 'caixa';
  }

  /**
   * Verifica se o usuário atual é admin
   */
  isAdmin() {
    const employees = this.get('employees') || [];
    const currentUser = this.get('currentUser');
    if (!currentUser) return false;
    
    const employee = employees.find(e => e.user_id === currentUser.id);
    return employee?.role === 'admin';
  }

  /**
   * Obtém o papel do usuário atual
   */
  getUserRole() {
    const isEmployee = this.get('isEmployee');
    const currentEmployee = this.get('currentEmployee');
    if (isEmployee && currentEmployee) return currentEmployee.role;

    const employees = this.get('employees') || [];
    const currentUser = this.get('currentUser');
    if (!currentUser) return null;

    const employee = employees.find(e => e.user_id === currentUser.id);
    return employee?.role || 'admin';
  }
}
