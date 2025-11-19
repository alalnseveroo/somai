/**
 * OrdersView - View para gestão de pedidos/entregas
 */
import { eventBus } from '../../core/EventBus.js';
import { formatCurrency, formatDateTime } from '../../utils/helpers.js';
import { modal } from '../components/Modal.js';

export class OrdersView {
  constructor(state, services) {
    this.state = state;
    this.services = services;
    this.currentPage = 1;
    this.ordersPerPage = 10;
  }

  /**
   * Renderiza a página de pedidos/entregas
   */
  render() {
    const page = document.getElementById('page-deliveries');
    if (!page) return;

    const orders = this.state.get('orders') || [];
    const activeCashSession = this.state.get('activeCashSession');

    if (!activeCashSession) {
      page.innerHTML = this._renderNoCashSession();
      return;
    }

    const sessionOrders = orders.filter(o => 
      o.caixa_sessao_id === activeCashSession.id && 
      o.status !== 'Cancelado'
    );

    page.innerHTML = `
      <div class="space-y-6">
        ${this._renderHeader(sessionOrders)}
        ${this._renderFilters()}
        ${this._renderTable(sessionOrders)}
        ${this._renderPagination(sessionOrders)}
      </div>
    `;

    this._attachEventListeners();
  }

  /**
   * Renderiza cabeçalho
   */
  _renderHeader(orders) {
    const canManageOrders = this.services.auth.can('manage:orders');
    const pendingOrders = orders.filter(o => o.status === 'Pendente').length;
    const completedOrders = orders.filter(o => o.status === 'Concluído').length;

    return `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold text-slate-900">Pedidos e Entregas</h2>
          ${canManageOrders ? `
          <button id="new-order-btn" 
                  class="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg 
                         hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm">
            <i data-lucide="plus" class="w-4 h-4"></i>
            Novo Pedido
          </button>
          ` : ''}
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
            <h3 class="text-xs font-medium text-yellow-800">Pendentes</h3>
            <p class="text-2xl font-bold text-yellow-900 mt-1">${pendingOrders}</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
            <h3 class="text-xs font-medium text-green-800">Concluídos</h3>
            <p class="text-2xl font-bold text-green-900 mt-1">${completedOrders}</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza filtros
   */
  _renderFilters() {
    return `
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="flex flex-wrap gap-2">
          <button data-filter="all" class="filter-btn active px-4 py-2 rounded-lg text-sm font-medium 
                                          bg-indigo-600 text-white">
            Todos
          </button>
          <button data-filter="Pendente" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium 
                                                bg-slate-100 text-slate-700 hover:bg-slate-200">
            Pendentes
          </button>
          <button data-filter="Concluído" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium 
                                                bg-slate-100 text-slate-700 hover:bg-slate-200">
            Concluídos
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza tabela de pedidos
   */
  _renderTable(orders) {
    const filtered = this._getFilteredOrders(orders);
    const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const paginated = this._getPaginatedOrders(sorted);

    if (!sorted || sorted.length === 0) {
      return `
        <div class="bg-white p-8 rounded-xl shadow-sm text-center">
          <i data-lucide="package" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
          <h3 class="text-lg font-bold text-slate-800">Nenhum pedido encontrado</h3>
          <p class="text-sm text-slate-500 mt-2">
            Não há pedidos registrados no sistema.
          </p>
        </div>
      `;
    }

    return `
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Itens</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valor</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pagamento</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sessão</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                <th scope="col" class="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              ${paginated.map(order => this._renderOrderRow(order)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _getFilteredOrders(orders) {
    const filter = this.state.get('ordersFilter') || 'all';
    if (filter === 'all') return orders;
    return orders.filter(o => o.status === filter);
  }

  _getPaginatedOrders(orders) {
    const start = (this.currentPage - 1) * this.ordersPerPage;
    const end = start + this.ordersPerPage;
    return orders.slice(start, end);
  }

  _renderPagination(orders) {
    const filtered = this._getFilteredOrders(orders);
    const total = filtered.length;
    const totalPages = Math.ceil(total / this.ordersPerPage);
    if (totalPages <= 1) return '';

    return `
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="flex items-center justify-between">
          <p class="text-sm text-slate-600">
            Mostrando ${((this.currentPage - 1) * this.ordersPerPage) + 1} a ${Math.min(this.currentPage * this.ordersPerPage, total)} de ${total} pedidos
          </p>
          <div class="flex gap-2">
            <button id="prev-page-btn" ${this.currentPage === 1 ? 'disabled' : ''}
                    class="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            <div class="flex gap-1">
              ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (this.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (this.currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = this.currentPage - 2 + i;
                }
                return `
                  <button data-page="${pageNum}" 
                          class="page-btn px-3 py-2 rounded-lg text-sm font-medium ${this.currentPage === pageNum ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                    ${pageNum}
                  </button>
                `;
              }).join('')}
            </div>
            <button id="next-page-btn" ${this.currentPage === totalPages ? 'disabled' : ''}
                    class="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  _renderOrderRow(order) {
    const canManageOrders = this.services.auth.can('manage:orders');
    const customers = this.state.get('customers') || [];
    const customer = customers.find(c => c.id === order.customer_id);
    const customerName = customer ? customer.name : 'Consumo Interno';
    
    // Obter nome do funcionário
    const employees = this.state.get('employees') || [];
    const employee = employees.find(e => e.id === order.employee_id);
    const employeeName = employee ? employee.name : 'N/A';
    
    // Obter sessão de caixa
    const cashSessions = this.state.get('cashSessions') || [];
    const cashSession = cashSessions.find(s => s.id === order.caixa_sessao_id);
    const sessionId = cashSession ? `#${cashSession.id}` : 'N/A';
    
    // Formatar itens do pedido
    const orderItems = this.state.get('orderItems') || [];
    const items = orderItems.filter(item => item.order_id === order.id);
    const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Status com cores
    const statusColors = {
      'Pendente': 'bg-amber-100 text-amber-800',
      'Concluído': 'bg-green-100 text-green-800',
      'Cancelado': 'bg-red-100 text-red-800',
      'Reembolsado': 'bg-slate-100 text-slate-800'
    };
    
    const statusClass = statusColors[order.status] || 'bg-slate-100 text-slate-800';

    return `
      <tr class="hover:bg-slate-50">
        <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-900">#${order.id}</td>
        <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-500">
          <div>${customerName}</div>
          <div class="text-xs text-slate-400">${employeeName}</div>
        </td>
        <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-500">${itemsCount} itens</td>
        <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-900">${formatCurrency(order.total_value)}</td>
        <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-500">
          <div>${order.payment_method}</div>
          ${order.is_delivery ? '<div class="text-xs text-slate-400">Entrega</div>' : ''}
        </td>
        <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-500">${sessionId}</td>
        <td class="px-3 py-2 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
            ${order.status}
          </span>
        </td>
        <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-500">${formatDateTime(order.created_at)}</td>
        <td class="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
          <div class="flex justify-end gap-2">
            ${order.status === 'Pendente' && canManageOrders ? `
              <button data-order-id="${order.id}" 
                      class="finalize-order-btn text-green-600 hover:text-green-900">
                Finalizar
              </button>
            ` : ''}
            <button data-order-id="${order.id}" 
                    class="view-order-btn text-indigo-600 hover:text-indigo-900">
              Detalhes
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Renderiza quando não há caixa aberto
   */
  _renderNoCashSession() {
    return `
      <div class="bg-white p-8 rounded-xl shadow-sm text-center">
        <i data-lucide="lock" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
        <h3 class="text-lg font-bold text-slate-800">Caixa Fechado</h3>
        <p class="text-sm text-slate-500 mt-2">
          Abra o caixa para gerenciar pedidos e entregas.
        </p>
      </div>
    `;
  }

  /**
   * Anexa event listeners
   */
  _attachEventListeners() {
    // Novo pedido
    document.getElementById('new-order-btn')?.addEventListener('click', () => {
      eventBus.emit('ui:navigate', 'order-create');
    });

    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.state.set('ordersFilter', filter);
        this.currentPage = 1;
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('active', 'bg-indigo-600', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        
        e.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
        e.currentTarget.classList.remove('bg-slate-100', 'text-slate-700');
        
        this.render();
      });
    });

    // Renderizar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Ações por linha
    document.querySelectorAll('.finalize-order-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        this._updateOrderStatus(orderId);
      });
    });
    document.querySelectorAll('.view-order-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        this._viewOrderDetails(orderId);
      });
    });

    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.render();
      }
    });
    document.getElementById('next-page-btn')?.addEventListener('click', () => {
      const activeCashSession = this.state.get('activeCashSession');
      const orders = (this.state.get('orders') || []).filter(o => o.caixa_sessao_id === activeCashSession?.id && o.status !== 'Cancelado');
      const filtered = this._getFilteredOrders(orders);
      const totalPages = Math.ceil(filtered.length / this.ordersPerPage);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.render();
      }
    });
    document.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentPage = parseInt(e.currentTarget.dataset.page);
        this.render();
      });
    });
  }

  /**
   * Visualiza detalhes do pedido
   */
  _viewOrderDetails(orderId) {
    eventBus.emit('order:edit', orderId);
  }

  /**
   * Atualiza status do pedido
   */
  async _updateOrderStatus(orderId) {
    try {
      const order = this.state.get('orders')?.find(o => o.id === parseInt(orderId));
      if (!order) return;

      // Definir próximo status (apenas Pendente <-> Concluído)
      const newStatus = order.status === 'Pendente' ? 'Concluído' : 'Pendente';

      // Atualizar no backend
      const updatedOrder = await this.services.order.update(orderId, { status: newStatus });
      
      // Atualizar no estado - corrigir problema da multiplicação
      const orders = this.state.get('orders') || [];
      const index = orders.findIndex(o => o.id === parseInt(orderId));
      if (index !== -1) {
        // Substituir o pedido existente em vez de adicionar um novo
        orders[index] = { ...orders[index], ...updatedOrder };
        this.state.set('orders', [...orders]); // Criar novo array para garantir reatividade
      }

      // Re-renderizar a view
      this.render();

      eventBus.emit('toast:show', {
        message: `Status do pedido atualizado para: ${newStatus}`,
        isError: false
      });
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      eventBus.emit('toast:show', {
        message: 'Erro ao atualizar status do pedido: ' + error.message,
        isError: true
      });
    }
  }
}
