import { formatCurrency, formatDateTime } from '../../utils/helpers.js';
import { modal } from '../components/Modal.js';
import { eventBus } from '../../core/EventBus.js';
import { maskCurrency, getNumericValue } from '../../utils/helpers.js';

/**
 * DashboardView - Renderiza o painel principal
 */
export class DashboardView {
  constructor(appState, services) {
    this.state = appState;
    this.services = services;
  }

  /**
   * Renderiza o dashboard completo
   */
  render() {
    const page = document.getElementById('page-dashboard');
    if (!page) return;

    const activeCashSession = this.state.get('activeCashSession');
    const canManageCash = this.services.auth.can('manage:cash');
    const canManageOrders = this.services.auth.can('manage:orders');

    if (activeCashSession) {
      this._renderOpenCashDashboard(page, canManageCash, canManageOrders);
    } else {
      this._renderClosedCashDashboard(page, canManageCash);
    }

    // Anexar event listeners
    this._attachEventListeners();

    // Recriar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Renderiza dashboard com caixa aberto
   */
  _renderOpenCashDashboard(page, canManageCash, canManageOrders) {
    const activeSession = this.state.get('activeCashSession');
    const orders = this.state.get('orders') || [];
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const today = new Date();
      return orderDate.toDateString() === today.toDateString();
    });
    
    // Calcular totais
    const todayRevenue = todayOrders
      .filter(o => o.status === 'Concluído')
      .reduce((sum, o) => sum + (o.total_value || 0), 0);
      
    const pendingOrders = orders.filter(o => o.status === 'Pendente').length;
    
    // Verificar se é admin ou funcionário
    const currentEmployee = this.state.get('currentEmployee');
    const currentUser = this.state.get('currentUser');
    const employees = this.state.get('employees') || [];
    const role = this.state.getUserRole();
    const isBarber = role === 'barbeiro';
    const myId = (employees.find(e => e.user_id === currentUser?.id)?.id) || currentEmployee?.id || null;
    const myTodayServices = isBarber 
      ? todayOrders.filter(o => o.status === 'Concluído' && (o.employee_id === myId || o.barbeiro_id === myId)).length 
      : 0;
    const displayName = currentEmployee?.employee_name || (currentUser?.user_metadata?.full_name || currentUser?.email || 'Usuário');

    page.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-800">Caixa Aberto</h2>
            <p class="text-sm text-slate-500">
              Caixa aberto em: ${formatDateTime(activeSession.data_abertura)}
              ${canManageCash ? ' - Sessão Ativa' : ''}
            </p>
          </div>
          <div class="flex gap-2">
            ${canManageOrders || canManageCash ? `
              <button id="lancar-pedido-btn" 
                      class="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg 
                             hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm">
                <i data-lucide="plus" class="w-4 h-4"></i>
                Lançar Pedido
              </button>
              ${canManageCash ? `
              <button id="close-caixa-btn" 
                      class="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg 
                             hover:bg-red-700 transition-colors flex items-center gap-2 text-sm">
                <i data-lucide="lock" class="w-4 h-4"></i>
                Fechar Caixa
              </button>
              ` : ''}
            ` : `
              <div class="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                <i data-lucide="check-circle" class="w-4 h-4 inline mr-1"></i>
                Caixa Aberto (Operado por ${currentEmployee?.employee_name || 'Funcionário'})
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Estatísticas -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <div class="flex items-center">
            <div class="p-3 ${isBarber ? 'bg-indigo-100' : 'bg-green-100'} rounded-lg">
              <i data-lucide="${isBarber ? 'scissors' : 'dollar-sign'}" class="w-6 h-6 ${isBarber ? 'text-indigo-600' : 'text-green-600'}"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-slate-600">${isBarber ? 'Meus Serviços Hoje' : 'Hoje'}</p>
              <p class="text-2xl font-bold text-slate-900">${isBarber ? myTodayServices : formatCurrency(todayRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <div class="flex items-center">
            <div class="p-3 bg-blue-100 rounded-lg">
              <i data-lucide="shopping-cart" class="w-6 h-6 text-blue-600"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-slate-600">Pedidos Hoje</p>
              <p class="text-2xl font-bold text-slate-900">${todayOrders.length}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <div class="flex items-center">
            <div class="p-3 bg-amber-100 rounded-lg">
              <i data-lucide="clock" class="w-6 h-6 text-amber-600"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-slate-600">Pendentes</p>
              <p class="text-2xl font-bold text-slate-900">${pendingOrders}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Últimos Pedidos -->
      <div class="bg-white p-6 rounded-xl shadow-sm mt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-base font-semibold text-slate-900">Últimos Pedidos</h3>
          <button id="view-all-orders-btn" 
                  class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            Ver todos
          </button>
        </div>
        <div id="recent-orders-list">
          ${this._renderRecentOrders(todayOrders.slice(0, 5))}
        </div>
      </div>

      <!-- Sessão de Caixa Ativa -->
      <div class="bg-white p-6 rounded-xl shadow-sm mt-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">Sessão de Caixa Ativa</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-indigo-50 p-4 rounded-lg">
            <p class="text-sm text-indigo-800 font-medium">ID da Sessão</p>
            <p class="text-lg font-bold text-indigo-900">#${activeSession.id}</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <p class="text-sm text-green-800 font-medium">Valor de Abertura</p>
            <p class="text-lg font-bold text-green-900">${formatCurrency(activeSession.valor_abertura)}</p>
          </div>
          <div class="bg-blue-50 p-4 rounded-lg">
            <p class="text-sm text-blue-800 font-medium">Aberto Por</p>
            <p class="text-lg font-bold text-blue-900">${displayName}</p>
          </div>
          <div class="bg-amber-50 p-4 rounded-lg">
            <p class="text-sm text-amber-800 font-medium">Data de Abertura</p>
            <p class="text-lg font-bold text-amber-900">${formatDateTime(activeSession.data_abertura)}</p>
          </div>
        </div>
      </div>
    `;

    this._attachEventListeners();
  }

  /**
   * Renderiza dashboard com caixa fechado
   */
  _renderClosedCashDashboard(page, canManageCash) {
    // Verificar se é admin ou funcionário
    const currentEmployee = this.state.get('currentEmployee');
    const currentUser = this.state.get('currentUser');
    const displayName = currentEmployee?.employee_name || (currentUser?.user_metadata?.full_name || currentUser?.email || 'Usuário');

    page.innerHTML = `
      <div class="bg-white p-8 rounded-xl shadow-sm text-center">
        <i data-lucide="archive" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
        <h3 class="text-lg font-bold text-slate-800">O caixa está fechado.</h3>
        <p class="text-sm text-slate-500 mt-2 mb-6">
          ${canManageCash 
            ? 'Clique no botão abaixo para iniciar uma nova sessão de vendas.' 
            : 'Nenhuma sessão de caixa está ativa no momento.'}
        </p>
        ${canManageCash ? `
          <button id="open-caixa-btn" 
                  class="bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg 
                         hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto text-sm">
            <i data-lucide="unlock" class="w-4 h-4"></i>
            Abrir Caixa
          </button>
        ` : `
          <div class="bg-red-100 text-red-800 px-4 py-3 rounded-lg text-sm font-medium inline-block">
            <i data-lucide="x-circle" class="w-4 h-4 inline mr-1"></i>
            Caixa Fechado
          </div>
        `}
      </div>

      <div class="mt-8 bg-white p-6 rounded-xl shadow-sm">
        <h3 class="text-base font-semibold text-slate-900 mb-4">
          Histórico de Sessões de Caixa
        </h3>
        <div id="cash-sessions-history-list" class="overflow-x-auto"></div>
      </div>
    `;
  }

  /**
   * Renderiza lista de pedidos recentes
   */
  _renderRecentOrders(orders) {
    if (orders.length === 0) {
      return `
        <p class="text-slate-500 text-center py-4">
          Nenhum pedido recente.
        </p>
      `;
    }

    return `
      <ul class="divide-y divide-slate-200">
        ${orders.map(o => `
          <li class="py-3 flex justify-between items-center">
            <div>
              <p class="font-semibold text-slate-800 text-sm">${o.customers?.name || 'N/A'}</p>
              <p class="text-xs text-slate-500">
                ${new Date(o.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-semibold text-base text-green-600">
                ${formatCurrency(o.total_value)}
              </span>
              <span class="text-green-500 text-sm">
                ${o.status}
              </span>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  /**
   * Anexa event listeners aos botões
   */
  _attachEventListeners() {
    // Botão de abrir caixa
    const openCaixaBtn = document.getElementById('open-caixa-btn');
    if (openCaixaBtn) {
      openCaixaBtn.addEventListener('click', () => {
        this._openCaixaModal();
      });
    }

    // Botão de fechar caixa
    const closeCaixaBtn = document.getElementById('close-caixa-btn');
    if (closeCaixaBtn) {
      closeCaixaBtn.addEventListener('click', () => {
        this._closeCaixaModal();
      });
    }

    // Botão de lançar pedido
    const lancarPedidoBtn = document.getElementById('lancar-pedido-btn');
    if (lancarPedidoBtn) {
      lancarPedidoBtn.addEventListener('click', () => {
        this._createOrderModal();
      });
    }

    // Botão de ver todos os pedidos
    const viewAllOrdersBtn = document.getElementById('view-all-orders-btn');
    if (viewAllOrdersBtn) {
      viewAllOrdersBtn.addEventListener('click', () => {
        eventBus.emit('ui:navigate', 'order-list');
      });
    }
  }

  /**
   * Abre modal de abertura de caixa
   */
  _openCaixaModal() {
    const content = `
      <form id="open-caixa-form" class="space-y-4">
        <div>
          <label for="valor-abertura" class="block text-sm font-medium text-slate-700 mb-2">
            Valor Inicial (Troco)
          </label>
          <input type="text" 
                 id="valor-abertura" 
                 required 
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="R$ 0,00">
        </div>
        
        <div class="flex gap-3 pt-4">
          <button type="button" 
                  id="cancel-open-btn"
                  class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-slate-300 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" 
                  class="flex-1 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-indigo-700 transition-colors text-sm">
            Abrir Caixa
          </button>
        </div>
      </form>
    `;

    modal.open('Abrir Caixa', content, { size: 'medium' });

    // Event listeners
    const form = document.getElementById('open-caixa-form');
    const valorInput = document.getElementById('valor-abertura');
    const cancelBtn = document.getElementById('cancel-open-btn');

    valorInput?.addEventListener('input', maskCurrency);
    cancelBtn?.addEventListener('click', () => modal.close());

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleOpenCaixa();
    });
  }

  /**
   * Abre modal de fechamento de caixa
   */
  _closeCaixaModal() {
    const activeSession = this.state.get('activeCashSession');
    if (!activeSession) return;

    const orders = this.state.get('orders') || [];
    const ordersInSession = orders.filter(o => 
      o.caixa_sessao_id === activeSession.id && o.status !== 'Cancelado'
    );
    const totalDinheiro = ordersInSession
      .filter(o => o.payment_method === 'Dinheiro')
      .reduce((sum, o) => sum + o.total_value, 0);
    const valorEsperado = activeSession.valor_abertura + totalDinheiro;

    const content = `
      <form id="close-caixa-form" class="space-y-4">
        <div class="bg-blue-50 p-4 rounded-lg mb-4">
          <p class="text-sm text-blue-900">
            <strong>Valor esperado em caixa:</strong> ${formatCurrency(valorEsperado)}
          </p>
          <p class="text-xs text-blue-700 mt-1">
            (Abertura: ${formatCurrency(activeSession.valor_abertura)} + Vendas em dinheiro: ${formatCurrency(totalDinheiro)})
          </p>
        </div>
        
        <div>
          <label for="valor-fechamento" class="block text-sm font-medium text-slate-700 mb-2">
            Valor Contado no Caixa
          </label>
          <input type="text" 
                 id="valor-fechamento" 
                 required 
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                 placeholder="R$ 0,00">
        </div>
        
        <div class="flex gap-3 pt-4">
          <button type="button" 
                  id="cancel-close-btn"
                  class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-slate-300 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" 
                  class="flex-1 bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-red-700 transition-colors text-sm">
            Confirmar Fechamento
          </button>
        </div>
      </form>
    `;

    modal.open('Fechar Caixa', content, { size: 'medium' });

    // Event listeners
    const form = document.getElementById('close-caixa-form');
    const valorInput = document.getElementById('valor-fechamento');
    const cancelBtn = document.getElementById('cancel-close-btn');

    valorInput?.addEventListener('input', maskCurrency);
    cancelBtn?.addEventListener('click', () => modal.close());

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleCloseCaixa();
    });
  }

  /**
   * Abre modal de criação de pedido
   */
  _createOrderModal() {
    eventBus.emit('ui:navigate', 'order-create');
  }

  /**
   * Processa abertura de caixa
   */
  async _handleOpenCaixa() {
    try {
      const valorInput = document.getElementById('valor-abertura');
      const valorAbertura = getNumericValue(valorInput.value);

      if (isNaN(valorAbertura) || valorAbertura < 0) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, insira um valor válido', 
          isError: true 
        });
        return;
      }

      const newSession = await this.services.cash.openSession(valorAbertura);
      
      modal.close();
      eventBus.emit('toast:show', { 
        message: 'Caixa aberto com sucesso!', 
        isError: false 
      });
      
      // Recarregar a view
      this.render();
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      eventBus.emit('toast:show', { 
        message: 'Erro ao abrir caixa: ' + error.message, 
        isError: true 
      });
      // Fechar o modal mesmo em caso de erro para melhor UX
      modal.close();
    }
  }

  /**
   * Processa fechamento de caixa
   */
  async _handleCloseCaixa() {
    try {
      const valorInput = document.getElementById('valor-fechamento');
      const valorFechamento = getNumericValue(valorInput.value);

      if (isNaN(valorFechamento) || valorFechamento < 0) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, insira um valor válido', 
          isError: true 
        });
        return;
      }

      await this.services.cash.closeSession(valorFechamento);
      
      modal.close();
      eventBus.emit('toast:show', { 
        message: 'Caixa fechado com sucesso!', 
        isError: false 
      });
      
      // Recarregar a view
      this.render();
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      eventBus.emit('toast:show', { 
        message: 'Erro ao fechar caixa: ' + error.message, 
        isError: true 
      });
      // Fechar o modal mesmo em caso de erro para melhor UX
      modal.close();
    }
  }
}
