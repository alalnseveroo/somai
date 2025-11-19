import { eventBus } from '../core/EventBus.js';
import { formatCurrency } from '../utils/helpers.js';
import { DashboardView } from './views/DashboardView.js';
import { PanelView } from './views/PanelView.js';
import { OrdersView } from './views/OrdersView.js';
import { CustomersView } from './views/CustomersView.js';
import { ProductsView } from './views/ProductsView.js';
import { InventoryView } from './views/InventoryView.js';
import { EmployeesView } from './views/EmployeesView.js';
import { FinancialsView } from './views/FinancialsView.js';
import { HistoryView } from './views/HistoryView.js';
import { OrderCreateView } from './views/OrderCreateView.js';

export class UIManager {
  constructor(state, services) {
    this.state = state;
    this.services = services;
    this.views = {};
    this.currentView = null;
    this.elements = {};
  }

  async init() {
    await this._initViews();
    this._setupEventListeners();
    this._attachDOMElements();
  }

  async _initViews() {
    console.log('Inicializando views com serviços:', this.services);
    
    // Inicializa todas as views
    this.views = {
      dashboard: new DashboardView(this.state, this.services),
      panel: new PanelView(this.state, this.services),
      deliveries: new OrdersView(this.state, this.services),
      customers: new CustomersView(this.state, this.services),
      products: new ProductsView(this.state, this.services),
      inventory: new InventoryView(this.state, this.services),
      employees: new EmployeesView(this.state, this.services),
      financials: new FinancialsView(this.state, this.services),
      history: new HistoryView(this.state, this.services),
      orderCreate: new OrderCreateView(this.state, this.services)
    };
  }

  _setupEventListeners() {
    // Eventos de navegação
    eventBus.on('ui:navigate', (page) => {
      this.navigate(page);
    });

    // Eventos de atualização de usuário
    eventBus.on('auth:user-updated', (user) => {
      this.updateUserInfo(user);
    });
  }

  _attachDOMElements() {
    // Referências aos elementos DOM
    this.elements = {
      appContainer: document.getElementById('app-container'),
      authContainer: document.getElementById('auth-container'),
      headerTitle: document.getElementById('header-title'),
      userName: document.getElementById('user-name'),
      userAvatarInitials: document.getElementById('user-avatar-initials'),
      userProfile: document.getElementById('user-profile'),
      userMenu: document.getElementById('user-menu'),
      logoutMenuBtn: document.getElementById('logout-menu-btn'),
      navLinks: document.querySelectorAll('.nav-link'),
      navPlusButtons: document.querySelectorAll('.nav-plus'),
      logoutBtn: document.getElementById('logout-btn'),
      tenantCombobox: document.getElementById('tenant-combobox'),
      tenantComboboxMenu: document.getElementById('tenant-combobox-menu'),
      tenantComboboxSidebar: document.getElementById('tenant-combobox-sidebar'),
      tenantComboboxMenuSidebar: document.getElementById('tenant-combobox-menu-sidebar')
    };

    // Adiciona event listeners aos links de navegação
    this.elements.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        this.navigate(page);
      });
    });

    this.elements.navPlusButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = btn.dataset.plus;
        if (!target) return;
        this.navigate(target);
        setTimeout(() => {
          try {
            if (target === 'dashboard') {
              const openBtn = document.getElementById('open-caixa-btn');
              const orderBtn = document.getElementById('lancar-pedido-btn');
              (orderBtn || openBtn)?.click();
            } else if (target === 'customers' && this.views.customers?._showCustomerForm) {
              this.views.customers._showCustomerForm();
            } else if (target === 'employees' && this.views.employees?._showEmployeeForm) {
              this.views.employees._showEmployeeForm();
            } else if (target === 'inventory' && this.views.inventory?._showIngredientForm) {
              this.views.inventory._showIngredientForm();
            } else if (target === 'products') {
              if (this.views.products?._showProductForm) this.views.products._showProductForm(null, false);
            }
          } catch {}
        }, 200);
      });
    });

    // Adiciona event listener ao botão de logout
    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }

    if (this.elements.userProfile) {
      this.elements.userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        this.elements.userMenu?.classList.toggle('hidden');
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      });
      document.addEventListener('click', () => {
        this.elements.userMenu?.classList.add('hidden');
      });
    }

    if (this.elements.logoutMenuBtn) {
      this.elements.logoutMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleLogout();
      });
    }

    this.elements.tenantCombobox?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.tenantComboboxMenu?.classList.toggle('hidden');
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
    this.elements.tenantComboboxSidebar?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.tenantComboboxMenuSidebar?.classList.toggle('hidden');
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
    document.addEventListener('click', () => {
      this.elements.tenantComboboxMenu?.classList.add('hidden');
      this.elements.tenantComboboxMenuSidebar?.classList.add('hidden');
    });
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  showApp() {
    // Verifica se os elementos existem antes de manipulá-los
    if (this.elements.authContainer) {
      this.elements.authContainer.classList.add('hidden');
    }
    if (this.elements.appContainer) {
      this.elements.appContainer.classList.remove('hidden');
    }
    // Garantir que o loading seja escondido quando a app é mostrada
    this.hideLoading();
    // Atualizar visibilidade da navegação
    this.updateNavigationVisibility();
  }

  showAuthScreen() {
    // Verifica se os elementos existem antes de manipulá-los
    if (this.elements.appContainer) {
      this.elements.appContainer.classList.add('hidden');
    }
    if (this.elements.authContainer) {
      this.elements.authContainer.classList.remove('hidden');
    }
    // Renderiza o formulário de autenticação
    if (this.services.auth) {
      this.services.auth.renderAuthView();
    }
    // Garantir que o loading seja escondido quando a tela de auth é mostrada
    this.hideLoading();
  }

  showLoading(message = 'Carregando...') {
    const overlay = document.getElementById('loading-overlay');
    const messageEl = overlay?.querySelector('.loading-message');
    
    if (overlay) {
      if (messageEl) {
        messageEl.textContent = message;
      }
      overlay.classList.remove('hidden');
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      // Usar setTimeout para garantir que a transição seja visível
      setTimeout(() => {
        overlay.classList.add('hidden');
      }, 200);
    }
  }

  navigate(page) {
    // Atualiza o hash da URL apenas se for diferente
    if (window.location.hash !== `#${page}`) {
      window.location.hash = page;
    }

    // Esconde todas as páginas
    document.querySelectorAll('.page').forEach(p => {
      p.classList.add('hidden');
    });

    // Mostra a página solicitada
    const pageElement = document.getElementById(`page-${page}`);
    if (pageElement) {
      pageElement.classList.remove('hidden');
    }

    // Atualiza o cabeçalho com avatares de funcionários
    if (this.elements.headerTitle) {
      const employees = this.state.get('employees') || [];
      const items = employees.slice(0, 10);
      const avatarsHtml = items.map((e, idx) => {
        const ml = idx === 0 ? 0 : -12;
        const z = 10 + idx;
        const name = e.name || 'Funcionário';
        const initial = name.charAt(0).toUpperCase();
        const img = e.avatar_url ? `<img src="${e.avatar_url}" class="w-12 h-12 rounded-full object-cover" />` : `<span class="text-xs font-bold text-slate-800">${initial}</span>`;
        return `
          <div class="header-emp-avatar group relative inline-flex items-center justify-center w-12 h-12 rounded-full border border-white shadow-sm bg-slate-100" 
               style="margin-left:${ml}px; z-index:${z};" 
               data-name="${name}">
          ${img}
          <div class="tooltip absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs rounded px-2 py-1" style="opacity:0; pointer-events:none;">
            ${name}
          </div>
          </div>
        `;
      }).join('');
      this.elements.headerTitle.innerHTML = `<div class="flex items-center">${avatarsHtml}</div>`;
      // Eventos de hover para destaque e tooltip
      document.querySelectorAll('.header-emp-avatar').forEach(el => {
        el.addEventListener('mouseenter', () => {
          el.style.zIndex = 999;
          const tip = el.querySelector('.tooltip');
          if (tip) tip.style.opacity = 1;
        });
        el.addEventListener('mouseleave', () => {
          const tip = el.querySelector('.tooltip');
          if (tip) tip.style.opacity = 0;
        });
      });
    }

    // Remove classe active-link de todos os links
    this.elements.navLinks.forEach(link => {
      link.classList.remove('active-link');
    });

    // Adiciona classe active-link ao link ativo
    const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (activeLink) {
      activeLink.classList.add('active-link');
    }

    // Renderiza a view correspondente
    if (this.views[page]) {
      this.views[page].render();
    } else if (this.views.orderCreate && page === 'order-create') {
      // Caso especial para order-create
      this.views.orderCreate.render();
    }

    // Atualiza a view atual
    this.currentView = page;
  }

  async updateUserInfo(user) {
    if (!user || !this.elements.userName || !this.elements.userAvatarInitials) return;

    const metadata = user.user_metadata;
    let displayName = 'Utilizador';
    let tenantName = 'Minha Empresa';

    if (metadata && metadata.full_name) {
      displayName = metadata.full_name;
    } else if (user.email) {
      displayName = user.email.split('@')[0];
      displayName = displayName.replace(/[._-]/g, ' ');
      displayName = displayName.split(' ').map(name => name.charAt(0).toUpperCase() + name.slice(1)).join(' ');
    }

    this.elements.userName.textContent = displayName;

    // Atualiza o avatar
    const initial = displayName.charAt(0).toUpperCase();
    this.elements.userAvatarInitials.querySelector('span').textContent = initial;

    const tenantId = this.state.get('tenantId') || user?.tenant?.id;
    if (tenantId && this.services?.db?.findById) {
      try {
        const tenant = await this.services.db.findById('tenants', tenantId, 'id,name');
        if (tenant?.name) {
          tenantName = tenant.name;
        }
      } catch (err) {
        console.warn('Falha ao buscar tenant por ID, usando fallback de metadata:', err);
        if (metadata && metadata.tenant_name) {
          tenantName = metadata.tenant_name;
        } else if (metadata && metadata.company_name) {
          tenantName = metadata.company_name;
        } else if (displayName) {
          tenantName = displayName;
        }
      }
    } else {
      if (metadata && metadata.tenant_name) {
        tenantName = metadata.tenant_name;
      } else if (metadata && metadata.company_name) {
        tenantName = metadata.company_name;
      } else if (displayName) {
        tenantName = displayName;
      }
    }

    const tenantNameDisplay = document.getElementById('tenant-name-display');
    if (tenantNameDisplay) tenantNameDisplay.textContent = tenantName;
    const tenantNameDisplaySidebar = document.getElementById('tenant-name-display-sidebar');
    if (tenantNameDisplaySidebar) tenantNameDisplaySidebar.textContent = tenantName;

    // Atualizar progresso de tenants restantes
    await this._updateTenantsProgress();
  }

  async _updateTenantsProgress() {
    try {
      const plan = this.state.get('subscriptionPlan');
      const tenantId = this.state.get('tenantId');
      if (!plan || !tenantId || !this.services?.db?.client) return;
      const tenant = await this.services.db.findById('tenants', tenantId, 'id,owner_id');
      const ownerId = tenant?.owner_id;
      if (!ownerId) return;
      const { data, error } = await this.services.db.client
        .from('tenants')
        .select('id')
        .eq('owner_id', ownerId);
      if (error) return;
      const used = (data || []).length;
      const total = plan.max_tenants_per_owner ?? 1;
      const remaining = Math.max(total - used, 0);
      const percent = Math.round((remaining / total) * 100);
      const bar = document.getElementById('plan-tenants-progress');
      const label = document.getElementById('plan-tenants-remaining-text');
      if (bar) bar.style.width = `${percent}%`;
      if (label) label.textContent = `${remaining} empresas restantes`;
    } catch (e) {}
  }

  updateNavigationVisibility() {
    const activeCashSession = this.state.get('activeCashSession');
    const role = this.state.getUserRole();

    const barbeiroAllowedPages = ['dashboard', 'financials'];
    const caixaAllowedPages = ['dashboard', 'deliveries', 'history'];

    this.elements.navLinks.forEach(link => {
      const pageId = link.getAttribute('data-page');

      let visible = true;
      if (role === 'barbeiro') {
        visible = barbeiroAllowedPages.includes(pageId);
      } else if (role === 'caixa') {
        visible = caixaAllowedPages.includes(pageId);
      } else {
        visible = true;
      }

      if (pageId === 'order-create') {
        const canOrders = this.services.auth?.can('manage:orders');
        visible = !!activeCashSession && !!canOrders;
      }

      link.style.display = visible ? 'flex' : 'none';
    });
  }

  async handleLogout() {
    const currentEmployee = this.state.get('currentEmployee');
    
    if (currentEmployee) {
      // Logout de funcionário
      localStorage.removeItem('employee_session');
      eventBus.emit('auth:employee-logout');
    } else {
      // Logout de admin
      await this.services.auth.logout();
    }
    
    // Resetar estado
    this.state.reset();
    
    // Mostrar tela de login
    this.showAuthScreen();
    
    // Recarregar página
    window.location.reload();
  }
}