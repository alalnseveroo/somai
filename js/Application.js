/**
 * Application - Classe principal que orquestra toda a aplicação
 */
import { AppState } from './core/AppState.js';
import { eventBus } from './core/EventBus.js';
import { createSupabaseClient } from './config/supabase.js';
import { SupabaseService } from './services/SupabaseService.js';
import { AuthService } from './services/AuthService.js';
import { OrderService } from './services/OrderService.js';
import { CustomerService } from './services/CustomerService.js';
import { ProductService } from './services/ProductService.js';
import { EmployeeService } from './services/EmployeeService.js';
import { CashService } from './services/CashService.js';
import { FinancialService } from './services/FinancialService.js';
import { InventoryService } from './services/InventoryService.js';
import { MotoboyService } from './services/MotoboyService.js';
import { UIManager } from './ui/UIManager.js';
import { OrderController } from './controllers/OrderController.js';
import { showLoading, hideLoading, showToast } from './utils/helpers.js';

export class Application {
  constructor() {
    this.state = new AppState();
    this.services = {};
    this.ui = null;
    this.supabaseClient = null;
  }

  /**
   * Inicializa a aplicação
   */
  async init() {
    try {
      console.log('🚀 Iniciando aplicação Somai...');
      
      // Mostrar loading durante a inicialização
      showLoading();
      
      // Set initialization flag to prevent multiple initializations
      this.state.set('isInitializing', true);
      
      await this._initSupabase();
      await this._initServices();
      await this._initUI();
      await this._setupEventListeners();
      await this._checkExistingSession();
      
      this.state.set('isInitialized', true);
      this.state.set('isInitializing', false);
      
      console.log('✅ Aplicação inicializada com sucesso!');
      // Esconder loading após a inicialização
      hideLoading();
    } catch (error) {
      console.error('❌ Erro ao inicializar aplicação:', error);
      this.state.set('isInitializing', false);
      showToast('Erro ao inicializar aplicação. Recarregue a página.', true);
      // Esconder loading em caso de erro
      hideLoading();
    }
  }

  /**
   * Inicializa o cliente Supabase
   */
  async _initSupabase() {
    console.log('🔧 Inicializando Supabase...');
    this.supabaseClient = createSupabaseClient();
    console.log('✅ Cliente Supabase criado');
  }

  /**
   * Inicializa os serviços
   */
  async _initServices() {
    const dbService = new SupabaseService(this.supabaseClient);
    const authService = new AuthService(this.supabaseClient, this.state);
    
    this.services = {
      db: dbService,
      auth: authService,
      order: new OrderService(dbService, this.state),
      customer: new CustomerService(dbService, this.state),
      product: new ProductService(dbService, this.state),
      employee: new EmployeeService(dbService, this.state, authService),
      cash: new CashService(dbService, this.state),
      financial: new FinancialService(dbService, this.state),
      inventory: new InventoryService(dbService, this.state),
      motoboy: new MotoboyService(dbService, this.state)
    };

    // Vincular serviços entre si para operações compostas
    this.services.inventory.services = this.services;
    this.services.order.services = this.services;
    
    // Inicializar controllers
    this.controllers = {
      order: new OrderController(
        this.services.order, 
        this.services.customer, 
        this.services.product, 
        this.state
      )
    };
    
    console.log('🔧 Serviços inicializados');
  }

  /**
   * Inicializa a interface do usuário
   */
  async _initUI() {
    this.ui = new UIManager(this.state, this.services);
    await this.ui.init();
    console.log('🎨 UI Manager inicializado');
  }

  /**
   * Configura os listeners de eventos
   */
  async _setupEventListeners() {
    // Eventos de autenticação
    eventBus.on('auth:login', async (user) => {
      console.log('🔐 Evento auth:login recebido:', user);
      await this._handleLogin(user);
    });
    
    eventBus.on('auth:logout', () => {
      console.log('🚪 Evento auth:logout recebido');
      this._handleLogout();
    });
    
    eventBus.on('auth:employee-login', async (session) => {
      console.log('👥 Evento auth:employee-login recebido:', session);
      await this._handleEmployeeLogin(session);
    });
    
    eventBus.on('auth:employee-logout', () => {
      console.log('🚪 Evento auth:employee-logout recebido');
      this._handleLogout();
    });
    
    eventBus.on('auth:user-updated', (user) => {
      console.log('👤 Evento auth:user-updated recebido:', user);
      this.state.set('currentUser', user);
      this.ui.updateUserInfo(user);
    });
    
    // Eventos de dados
    eventBus.on('data:reload', async () => {
      console.log('🔄 Evento data:reload recebido');
      await this._loadData();
    });
    
    // Eventos de produtos
    eventBus.on('product:created', (product) => {
      console.log('🆕 Evento product:created recebido:', product);
      const products = this.state.get('products') || [];
      this.state.set('products', [...products, product]);
    });
    
    eventBus.on('product:updated', (product) => {
      console.log('✏️ Evento product:updated recebido:', product);
      const products = this.state.get('products') || [];
      const index = products.findIndex(p => p.id === product.id);
      if (index !== -1) {
        products[index] = product;
        this.state.set('products', [...products]);
      }
    });
    
    eventBus.on('product:deactivated', (product) => {
      console.log('🗑️ Evento product:deactivated recebido:', product);
      const products = this.state.get('products') || [];
      this.state.set('products', products.filter(p => p.id !== product.id));
    });
    
    eventBus.on('product:activated', (product) => {
      console.log('✅ Evento product:activated recebido:', product);
      const products = this.state.get('products') || [];
      this.state.set('products', [...products, product]);
    });
    
    eventBus.on('product:low-stock', (product) => {
      console.log('⚠️ Evento product:low-stock recebido:', product);
      // Emitir notificação de estoque baixo
      eventBus.emit('toast:show', {
        message: `Estoque baixo: ${product.name}`,
        isError: true
      });
    });
    
    // Eventos de estoque de produtos
    eventBus.on('product:stock-updated', (product) => {
      console.log('📦 Evento product:stock-updated recebido:', product);
      const products = this.state.get('products') || [];
      const index = products.findIndex(p => p.id === product.id);
      if (index !== -1) {
        products[index] = product;
        this.state.set('products', [...products]);
      }
    });
    
    // Eventos de ingredientes
    eventBus.on('ingredient:stock-updated', (ingredient) => {
      console.log('🥕 Evento ingredient:stock-updated recebido:', ingredient);
      const ingredients = this.state.get('ingredients') || [];
      const index = ingredients.findIndex(i => i.id === ingredient.id);
      if (index !== -1) {
        ingredients[index] = ingredient;
        this.state.set('ingredients', [...ingredients]);
      }
    });
    
    eventBus.on('ingredient:low-stock', (ingredient) => {
      console.log('⚠️ Evento ingredient:low-stock recebido:', ingredient);
      // Emitir notificação de estoque baixo
      eventBus.emit('toast:show', {
        message: `Estoque baixo: ${ingredient.name}`,
        isError: true
      });
    });
    
    // Eventos de associação produto-ingrediente
    eventBus.on('product-ingredient:added', (productIngredient) => {
      console.log('🔗 Evento product-ingredient:added recebido:', productIngredient);
      const productIngredients = this.state.get('productIngredients') || [];
      this.state.set('productIngredients', [...productIngredients, productIngredient]);
    });
    
    eventBus.on('product-ingredient:removed', (productIngredientId) => {
      console.log('❌ Evento product-ingredient:removed recebido:', productIngredientId);
      const productIngredients = this.state.get('productIngredients') || [];
      this.state.set('productIngredients',
        productIngredients.filter(pi => pi.id !== productIngredientId)
      );
    });
    
    eventBus.on('product-ingredient:updated', (productIngredient) => {
      console.log('✏️ Evento product-ingredient:updated recebido:', productIngredient);
      const productIngredients = this.state.get('productIngredients') || [];
      const index = productIngredients.findIndex(pi => pi.id === productIngredient.id);
      if (index !== -1) {
        productIngredients[index] = productIngredient;
        this.state.set('productIngredients', [...productIngredients]);
      }
    });
    
    // Eventos de clientes
    eventBus.on('customer:created', (customer) => {
      console.log('👤 Evento customer:created recebido:', customer);
      const customers = this.state.get('customers') || [];
      this.state.set('customers', [...customers, customer]);
    });
    
    eventBus.on('customer:updated', (customer) => {
      console.log('✏️ Evento customer:updated recebido:', customer);
      const customers = this.state.get('customers') || [];
      const index = customers.findIndex(c => c.id === customer.id);
      if (index !== -1) {
        customers[index] = customer;
        this.state.set('customers', [...customers]);
      }
    });
    
    eventBus.on('customer:deleted', (customerId) => {
      console.log('🗑️ Evento customer:deleted recebido:', customerId);
      const customers = this.state.get('customers') || [];
      this.state.set('customers', customers.filter(c => c.id !== customerId));
    });
    
    // Eventos de pedidos
    eventBus.on('order:created', (order) => {
      console.log('🛒 Evento order:created recebido:', order);
      const orders = this.state.get('orders') || [];
      const existsIndex = orders.findIndex(o => o.id === order.id);
      if (existsIndex !== -1) {
        orders[existsIndex] = order;
        this.state.set('orders', [...orders]);
      } else {
        this.state.set('orders', [...orders, order]);
      }
    });
    
    eventBus.on('order:updated', (order) => {
      console.log('✏️ Evento order:updated recebido:', order);
      const orders = this.state.get('orders') || [];
      const index = orders.findIndex(o => o.id === order.id);
      if (index !== -1) {
        orders[index] = order;
        this.state.set('orders', [...orders]);
      }
    });
    
    eventBus.on('order:cancelled', (order) => {
      console.log('❌ Evento order:cancelled recebido:', order);
      const orders = this.state.get('orders') || [];
      const index = orders.findIndex(o => o.id === order.id);
      if (index !== -1) {
        orders[index] = order;
        this.state.set('orders', [...orders]);
      }
    });
    
    eventBus.on('order:refunded', (order) => {
      console.log('💰 Evento order:refunded recebido:', order);
      const orders = this.state.get('orders') || [];
      const index = orders.findIndex(o => o.id === order.id);
      if (index !== -1) {
        orders[index] = order;
        this.state.set('orders', [...orders]);
      }
    });
    
    // Eventos de caixa
    eventBus.on('cash:session-opened', (session) => {
      console.log('🔓 Evento cash:session-opened recebido:', session);
      const sessions = this.state.get('cashSessions') || [];
      this.state.set('cashSessions', [session, ...sessions]);
      this.state.set('activeCashSession', session);
      // Atualizar navegação quando o caixa for aberto
      this.ui.updateNavigationVisibility();
      // Recarregar dados para garantir consistência
      this._loadData();
    });
    
    eventBus.on('cash:session-closed', (session) => {
      console.log('🔒 Evento cash:session-closed recebido:', session);
      const sessions = this.state.get('cashSessions') || [];
      const index = sessions.findIndex(s => s.id === session.id);
      if (index !== -1) {
        sessions[index] = session;
        this.state.set('cashSessions', [...sessions]);
      }
      this.state.set('activeCashSession', null);
      // Atualizar navegação quando o caixa for fechado
      this.ui.updateNavigationVisibility();
      // Recarregar dados para garantir consistência
      this._loadData();
    });
    
    // Eventos de despesas
    eventBus.on('expense:created', (expense) => {
      console.log('💸 Evento expense:created recebido:', expense);
      const expenses = this.state.get('expenses') || [];
      this.state.set('expenses', [expense, ...expenses]);
    });
    
    eventBus.on('expense:updated', (expense) => {
      console.log('✏️ Evento expense:updated recebido:', expense);
      const expenses = this.state.get('expenses') || [];
      const index = expenses.findIndex(e => e.id === expense.id);
      if (index !== -1) {
        expenses[index] = expense;
        this.state.set('expenses', [...expenses]);
      }
    });
    
    eventBus.on('expense:deleted', (expenseId) => {
      console.log('🗑️ Evento expense:deleted recebido:', expenseId);
      const expenses = this.state.get('expenses') || [];
      this.state.set('expenses', expenses.filter(e => e.id !== expenseId));
    });
    
    // Eventos de receitas pessoais
    eventBus.on('personal-income:created', (income) => {
      console.log('💰 Evento personal-income:created recebido:', income);
      const incomes = this.state.get('personalIncomes') || [];
      this.state.set('personalIncomes', [income, ...incomes]);
    });
    
    eventBus.on('personal-income:updated', (income) => {
      console.log('✏️ Evento personal-income:updated recebido:', income);
      const incomes = this.state.get('personalIncomes') || [];
      const index = incomes.findIndex(i => i.id === income.id);
      if (index !== -1) {
        incomes[index] = income;
        this.state.set('personalIncomes', [...incomes]);
      }
    });
    
    eventBus.on('personal-income:deleted', (incomeId) => {
      console.log('🗑️ Evento personal-income:deleted recebido:', incomeId);
      const incomes = this.state.get('personalIncomes') || [];
      this.state.set('personalIncomes', incomes.filter(i => i.id !== incomeId));
    });
    
    // Eventos de ingredientes
    eventBus.on('ingredient:created', (ingredient) => {
      console.log('🥕 Evento ingredient:created recebido:', ingredient);
      const ingredients = this.state.get('ingredients') || [];
      this.state.set('ingredients', [...ingredients, ingredient]);
    });
    
    eventBus.on('ingredient:updated', (ingredient) => {
      console.log('✏️ Evento ingredient:updated recebido:', ingredient);
      const ingredients = this.state.get('ingredients') || [];
      const index = ingredients.findIndex(i => i.id === ingredient.id);
      if (index !== -1) {
        ingredients[index] = ingredient;
        this.state.set('ingredients', [...ingredients]);
      }
    });
    
    eventBus.on('ingredient:deleted', (ingredientId) => {
      console.log('🗑️ Evento ingredient:deleted recebido:', ingredientId);
      const ingredients = this.state.get('ingredients') || [];
      this.state.set('ingredients', ingredients.filter(i => i.id !== ingredientId));
    });
    
    // Eventos de motoboys
    eventBus.on('motoboy:created', (motoboy) => {
      console.log('🏍️ Evento motoboy:created recebido:', motoboy);
      const motoboys = this.state.get('motoboys') || [];
      this.state.set('motoboys', [...motoboys, motoboy]);
    });
    
    eventBus.on('motoboy:updated', (motoboy) => {
      console.log('✏️ Evento motoboy:updated recebido:', motoboy);
      const motoboys = this.state.get('motoboys') || [];
      const index = motoboys.findIndex(m => m.id === motoboy.id);
      if (index !== -1) {
        motoboys[index] = motoboy;
        this.state.set('motoboys', [...motoboys]);
      }
    });
    
    eventBus.on('motoboy:deleted', (motoboyId) => {
      console.log('🗑️ Evento motoboy:deleted recebido:', motoboyId);
      const motoboys = this.state.get('motoboys') || [];
      this.state.set('motoboys', motoboys.filter(m => m.id !== motoboyId));
    });
    
    // Eventos de funcionários
    eventBus.on('employee:created', (employee) => {
      console.log('👷 Evento employee:created recebido:', employee);
      const employees = this.state.get('employees') || [];
      this.state.set('employees', [...employees, employee]);
    });
    
    eventBus.on('employee:updated', (employee) => {
      console.log('✏️ Evento employee:updated recebido:', employee);
      const employees = this.state.get('employees') || [];
      const index = employees.findIndex(e => e.id === employee.id);
      if (index !== -1) {
        employees[index] = employee;
        this.state.set('employees', [...employees]);
      }
    });
    
    eventBus.on('employee:deleted', (employeeId) => {
      console.log('🗑️ Evento employee:deleted recebido:', employeeId);
      const employees = this.state.get('employees') || [];
      this.state.set('employees', employees.filter(e => e.id !== employeeId));
    });
    
    // Eventos de UI
    eventBus.on('ui:navigate', (page) => {
      console.log('🧭 Evento ui:navigate recebido:', page);
      this.ui.navigate(page);
    });
    
    // Evento de toast
    eventBus.on('toast:show', ({ message, isError }) => {
      console.log('📢 Evento toast:show recebido:', { message, isError });
      showToast(message, isError);
    });
    
    // Listener de autenticação do Supabase
    this.services.auth.setupAuthListener();
    
    // Listener de mudança de hash
    window.addEventListener('hashchange', () => this.handleRouteChange());
    
    console.log('📡 Event listeners configurados');
  }
  
  /**
   * Verifica se já existe uma sessão ativa
   */
  async _checkExistingSession() {
    try {
      console.log('🔍 Verificando sessão existente...');
      
      // Verificar sessão de funcionário
      const employeeSession = this.services.auth.checkEmployeeSession();
      console.log('📋 Sessão de funcionário:', employeeSession);
      
      if (employeeSession) {
        console.log('👥 Sessão de funcionário encontrada, iniciando login...');
        await this._handleEmployeeLogin(employeeSession);
        return;
      }
      
      // Verificar sessão de admin
      console.log('🔐 Verificando sessão de admin...');
      const session = await this.services.auth.getSession();
      console.log('📋 Sessão de admin:', session);
      
      if (session) {
        console.log('👑 Sessão de admin encontrada, iniciando login...');
        await this._handleLogin(session.user);
      } else {
        console.log('❌ Nenhuma sessão encontrada, mostrando tela de login');
        this.state.set('showingAuthScreen', true);
        this.ui.showAuthScreen();
      }
      
      // Lidar com a rota inicial
      this.handleRouteChange();
    } catch (error) {
      console.log('❌ Erro ao verificar sessão, mostrando tela de login:', error);
      this.state.set('showingAuthScreen', true);
      this.ui.showAuthScreen();
    } finally {
      hideLoading();
    }
  }

  
  /**
   * Manipula a mudança de rota
   */
  handleRouteChange() {
    const hash = window.location.hash.substring(1);
    console.log(`Hash changed to: ${hash}`);

    const isAuthenticated = this.state.get('currentUser') || this.state.get('isEmployee');

    if (!isAuthenticated) {
      this.ui.showAuthScreen();
      return;
    }

    const page = hash || 'dashboard';
    this.ui.navigate(page);
  }

  /**
   * Handler de login
   */
  async _handleLogin(user) {
    try {
      console.log('🔐 Iniciando processo de login para:', user.email);
      this.state.set('currentUser', user);
      
      let tenantId = user?.tenant?.id;
      if (!tenantId) {
        console.log('Buscando tenant do usuário...');
        const { data: tenantUser, error } = await this.supabaseClient
          .from('tenant_users')
          .select('tenant_id, tenants(*)')
          .eq('user_id', user.id)
          .single();
        if (error) throw error;
        tenantId = tenantUser?.tenant_id;
        if (tenantUser?.tenants) {
          user.tenant = tenantUser.tenants;
        }
      }
      console.log('Tenant ID do usuário:', tenantId);
      if (!tenantId) throw new Error('Tenant ID não encontrado para o usuário.');
      
      await this._loadData(tenantId);
      this.state.set('tenantId', tenantId);
      
      this.ui.showApp();
      this.ui.updateUserInfo(user);
      this.ui.navigate('dashboard');
      console.log('✅ Login concluído com sucesso');
    } catch (error) {
      console.error('❌ Erro no login:', error);
      showToast('Erro ao carregar dados do usuário', true);
      hideLoading();
      this.ui.showAuthScreen();
    }
  }
  
  /**
   * Handler de login de funcionário
   */
  async _handleEmployeeLogin(session) {
    try {
      console.log('👥 Iniciando processo de login de funcionário para:', session.user.email);
      
      // Verificar se o tenantId está presente
      const tenantId = session.tenant?.id;
      console.log('Tenant ID do funcionário:', tenantId);
      
      if (!tenantId) {
        throw new Error('Tenant ID não encontrado no funcionário.');
      }
      
      this.state.set({
        currentEmployee: session,
        isEmployee: true,
        currentUser: session.user,
        tenantId: tenantId,
        ownerUserId: session.tenant?.owner_id,
      });
      
      console.log('📊 Carregando dados para funcionário...');
      await this._loadData(tenantId);
      
      console.log('🖥️ Mostrando app para funcionário...');
      this.ui.showApp();
      this.ui.updateUserInfo(this.state.get('currentUser'));
      this.ui.navigate('dashboard');
      this.ui.updateNavigationVisibility();
      
      hideLoading();
      console.log('✅ Login de funcionário concluído com sucesso');
    } catch (error) {
      console.error('❌ Erro no login de funcionário:', error);
      localStorage.removeItem('employee_session');
      showToast('Erro ao carregar dados', true);
      this.ui.showAuthScreen();
      hideLoading();
    }
  }
  
  /**
   * Handler de logout
   */
  _handleLogout() {
    console.log('🚪 Iniciando processo de logout');
    this.state.reset();
    this.state.set('showingAuthScreen', true);
    if (this.ui) {
      this.ui.showAuthScreen();
    }
    hideLoading();
    console.log('✅ Logout concluído');
  }
  
  /**
   * Carrega todos os dados do tenant
   */
  async _loadData(tenantId) {
    try {
      console.log('🔄 Carregando dados para o tenant:', tenantId);
      
      if (!tenantId) {
        throw new Error('ID de tenant não encontrado');
      }
      
      const data = await this.services.db.loadUserData(tenantId);
      
      this.state.set({
        customers: data.customers || [],
        products: data.products || [],
        orders: data.orders || [],
        expenses: data.expenses || [],
        personalIncomes: data.personal_incomes || [],
        ingredients: data.ingredients || [],
        productIngredients: data.product_ingredients || [],
        orderItems: data.order_items || [],
        motoboys: data.motoboys || [],
        cashSessions: data.caixa_sessoes || [],
        employees: data.employees || []
      });
      
      const activeCashSession = data.caixa_sessoes?.find(s => !s.data_fechamento);
      this.state.set('activeCashSession', activeCashSession || null);

      // Carregar plano de assinatura vinculado ao owner do tenant
      try {
        const tenant = await this.services.db.findById('tenants', tenantId, 'id,owner_id');
        if (tenant?.owner_id) {
          const { data: userPlan, error } = await this.services.db.client
            .from('user_plans')
            .select('*, subscription_plans(*)')
            .eq('user_id', tenant.owner_id)
            .eq('active', true)
            .single();
          if (!error && userPlan) {
            const planInfo = userPlan.subscription_plans || null;
            this.state.set('subscriptionPlan', planInfo);
          } else {
            this.state.set('subscriptionPlan', { name: 'basic', price_brl: 97, max_tenants_per_owner: 1, max_employees_per_tenant: 5 });
          }
        }
      } catch (e) {
        console.warn('Falha ao carregar plano de assinatura, aplicando defaults:', e);
        this.state.set('subscriptionPlan', { name: 'basic', price_brl: 97, max_tenants_per_owner: 1, max_employees_per_tenant: 5 });
      }
      
      console.log('✅ Dados carregados com sucesso');
      eventBus.emit('data:loaded', data);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      throw error;
    }
  }
}

// Criar e expor instância global
window.app = null;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 DOMContentLoaded disparado');
  try {
    window.app = new Application();
    await window.app.init();
    console.log('🎉 Aplicação inicializada com sucesso');
  } catch (error) {
    console.error('💥 Falha fatal na inicialização:', error);
  }
});
