/**
 * Constantes da aplicação
 */

// Permissões por role
export const PERMISSIONS = {
  ADMIN: [
    'view:dashboard',
    'view:deliveries',
    'view:history',
    'view:customers',
    'view:products',
    'view:inventory',
    'view:financials',
    'view:employees',
    'manage:orders',
    'manage:customers',
    'manage:products',
    'manage:employees',
    'manage:cash'
  ],
  CAIXA: [
    'view:dashboard',
    'view:deliveries',
    'view:history',
    'manage:orders',
    'manage:cash'
  ],
  BARBEIRO: [
    'view:dashboard',
    'view:financials'
  ]
};

// Categorias de produtos
export const PRODUCT_CATEGORIES = {
  PRINCIPAL: 'principal',
  EXTRA: 'extra'
};

// Status de pedidos
export const ORDER_STATUS = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado'
};

// Métodos de pagamento
export const PAYMENT_METHODS = {
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  PIX: 'Pix'
};

// Unidades de medida
export const UNITS = {
  KG: 'kg',
  G: 'g',
  UN: 'unidade',
  L: 'L',
  ML: 'ml'
};

// Tipos de despesa
export const EXPENSE_TYPES = {
  BUSINESS: 'empresa',
  PERSONAL: 'pessoal',
  COMMISSION: 'comissao',
  BARBER_PAYMENT: 'pagamento_barbeiro'
};

// Roles de funcionários
export const EMPLOYEE_ROLES = {
  ADMIN: 'admin',
  CASHIER: 'caixa',
  BARBER: 'barbeiro'
};

// Labels para roles
export const EMPLOYEE_ROLE_LABELS = {
  [EMPLOYEE_ROLES.ADMIN]: 'Admin',
  [EMPLOYEE_ROLES.CASHIER]: 'Caixa',
  [EMPLOYEE_ROLES.BARBER]: 'Barbeiro'
};

// Eventos do EventBus
export const EVENTS = {
  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_EMPLOYEE_LOGIN: 'auth:employee-login',
  AUTH_EMPLOYEE_LOGOUT: 'auth:employee-logout',
  AUTH_USER_UPDATED: 'auth:user-updated',

  // Data
  DATA_LOADED: 'data:loaded',
  DATA_RELOAD: 'data:reload',

  // Orders
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_CANCELLED: 'order:cancelled',
  ORDER_REFUNDED: 'order:refunded',

  // Customers
  CUSTOMER_CREATED: 'customer:created',
  CUSTOMER_UPDATED: 'customer:updated',
  CUSTOMER_DELETED: 'customer:deleted',

  // Products
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_ACTIVATED: 'product:activated',
  PRODUCT_DEACTIVATED: 'product:deactivated',
  PRODUCT_STOCK_UPDATED: 'product:stock-updated',
  PRODUCT_LOW_STOCK: 'product:low-stock',

  // UI
  UI_NAVIGATE: 'ui:navigate',
  UI_VIEW_MODE_CHANGED: 'ui:view-mode-changed',
  PAGE_RENDER: 'page:render',

  // Toast
  TOAST_SHOW: 'toast:show'
};

// Configurações padrão
export const DEFAULTS = {
  ITEMS_PER_PAGE: 10,
  TOAST_DURATION: 4000,
  LOADING_DELAY: 200,
  DATA_TIMEOUT: 30000
};

// Storage buckets do Supabase
export const STORAGE_BUCKETS = {
  ICONS: 'icones',
  PRODUCTS: 'products',
  AVATARS: 'avatars'
};

// Modos de visualização
export const VIEW_MODES = {
  BUSINESS: 'empresa',
  PERSONAL: 'pessoal'
};
