/**
 * HistoryView - View para histórico de pedidos
 */
import { eventBus } from '../../core/EventBus.js';
import { formatCurrency, formatDateTime } from '../../utils/helpers.js';

export class HistoryView {
  constructor(state, services) {
    this.state = state;
    this.services = services;
    this.currentPage = 1;
    this.ordersPerPage = 10;
  }

  /**
   * Renderiza a página de histórico
   */
  render() {
    const page = document.getElementById('page-history');
    if (!page) return;

    const orders = this.state.get('orders') || [];

    page.innerHTML = `
      <div class="space-y-6">
        ${this._renderHeader(orders)}
        ${this._renderFilters()}
        ${this._renderOrdersTable(orders)}
        ${this._renderPagination(orders)}
      </div>
    `;

    this._attachEventListeners();
  }

  /**
   * Renderiza cabeçalho
   */
  _renderHeader(orders) {
    const total = orders.reduce((sum, o) => sum + (o.total_value || 0), 0);
    const completed = orders.filter(o => o.status === 'Concluído').length;

    return `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Histórico de Pedidos</h2>
            <p class="text-sm text-slate-600 mt-1">
              ${orders.length} pedidos registrados
            </p>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <h3 class="text-xs font-medium text-blue-800">Total de Pedidos</h3>
            <p class="text-2xl font-bold text-blue-900 mt-1">${orders.length}</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
            <h3 class="text-xs font-medium text-green-800">Pedidos Concluídos</h3>
            <p class="text-2xl font-bold text-green-900 mt-1">${completed}</p>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
            <h3 class="text-xs font-medium text-purple-800">Valor Total</h3>
            <p class="text-2xl font-bold text-purple-900 mt-1">${formatCurrency(total)}</p>
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
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div class="relative">
            <input type="text" 
                   id="search-order" 
                   placeholder="Buscar pedido..."
                   class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
            <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
          </div>
          
          <select id="filter-status" 
                  class="px-4 py-2 border border-slate-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
            <option value="all">Todos os Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Concluído">Concluído</option>
            <option value="Cancelado">Cancelado</option>
          </select>

          <select id="filter-payment" 
                  class="px-4 py-2 border border-slate-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
            <option value="all">Todas as Formas</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão">Cartão</option>
            <option value="Pix">Pix</option>
          </select>

          <button id="clear-filters-btn" 
                  class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg 
                         hover:bg-slate-200 transition-colors text-sm font-medium">
            Limpar Filtros
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza tabela de pedidos
   */
  _renderOrdersTable(orders) {
    const filteredOrders = this._getFilteredOrders(orders);
    const paginatedOrders = this._getPaginatedOrders(filteredOrders);

    if (filteredOrders.length === 0) {
      return `
        <div class="bg-white p-8 rounded-xl shadow-sm text-center">
          <i data-lucide="package" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
          <p class="text-slate-500">Nenhum pedido encontrado</p>
        </div>
      `;
    }

    return `
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr class="text-xs text-slate-600">
                <th class="px-3 py-2 font-semibold">ID</th>
                <th class="px-3 py-2 font-semibold">Cliente</th>
                <th class="px-3 py-2 font-semibold">Data/Hora</th>
                <th class="px-3 py-2 font-semibold">Status</th>
                <th class="px-3 py-2 font-semibold">Pagamento</th>
                <th class="px-3 py-2 font-semibold text-right">Valor</th>
                <th class="px-3 py-2 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${paginatedOrders.map(order => this._renderOrderRow(order)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza linha de pedido
   */
  _renderOrderRow(order) {
    const customer = this.state.get('customers')?.find(c => c.id === order.customer_id);
    const employee = this.state.get('employees')?.find(e => e.id === order.employee_id);
    
    const statusColors = {
      'Pendente': 'bg-yellow-100 text-yellow-800',
      'Concluído': 'bg-green-100 text-green-800',
      'Cancelado': 'bg-red-100 text-red-800'
    };

    const paymentIcons = {
      'Dinheiro': 'banknote',
      'Cartão': 'credit-card',
      'Pix': 'smartphone'
    };

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono text-slate-700">#${String(order.id).slice(0, 8)}</span>
            ${order.is_delivery ? '<i data-lucide="truck" class="w-4 h-4 text-indigo-600"></i>' : ''}
          </div>
        </td>
        <td class="px-3 py-2">
          <div>
            <p class="text-sm font-medium text-slate-900">${customer?.name || 'N/A'}</p>
            ${employee ? `
              <p class="text-xs text-slate-500">Atendido por: ${employee.name}</p>
            ` : ''}
          </div>
        </td>
        <td class="px-3 py-2">
          <span class="text-sm text-slate-700">${formatDateTime(order.created_at)}</span>
        </td>
        <td class="px-3 py-2">
          <span class="inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-slate-100 text-slate-800'}">
            ${order.status}
          </span>
        </td>
        <td class="px-3 py-2">
          <div class="flex items-center gap-2">
            <i data-lucide="${paymentIcons[order.payment_method] || 'help-circle'}" class="w-4 h-4 text-slate-500"></i>
            <span class="text-sm text-slate-700">${order.payment_method}</span>
          </div>
        </td>
        <td class="px-3 py-2 text-right">
          <span class="text-sm font-bold text-slate-900">${formatCurrency(order.total_value)}</span>
        </td>
        <td class="px-3 py-2">
          <div class="flex gap-1 justify-center">
            <button data-order-id="${order.id}" 
                    class="view-order-btn text-indigo-600 hover:text-indigo-700 p-1"
                    title="Ver detalhes">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            ${order.status === 'Cancelado' ? '' : `
              <button data-order-id="${order.id}" 
                      class="print-order-btn text-slate-600 hover:text-slate-700 p-1"
                      title="Imprimir">
                <i data-lucide="printer" class="w-4 h-4"></i>
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Renderiza paginação
   */
  _renderPagination(orders) {
    const filteredOrders = this._getFilteredOrders(orders);
    const totalPages = Math.ceil(filteredOrders.length / this.ordersPerPage);
    
    if (totalPages <= 1) return '';

    return `
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="flex items-center justify-between">
          <p class="text-sm text-slate-600">
            Mostrando ${((this.currentPage - 1) * this.ordersPerPage) + 1} a ${Math.min(this.currentPage * this.ordersPerPage, filteredOrders.length)} de ${filteredOrders.length} pedidos
          </p>
          
          <div class="flex gap-2">
            <button id="prev-page-btn" 
                    ${this.currentPage === 1 ? 'disabled' : ''}
                    class="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg 
                           hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
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
                          class="page-btn px-3 py-2 rounded-lg text-sm font-medium
                                 ${this.currentPage === pageNum ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                    ${pageNum}
                  </button>
                `;
              }).join('')}
            </div>
            
            <button id="next-page-btn" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}
                    class="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg 
                           hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Obtém pedidos filtrados
   */
  _getFilteredOrders(orders) {
    const search = this.state.get('historySearch') || '';
    const statusFilter = this.state.get('historyStatusFilter') || 'all';
    const paymentFilter = this.state.get('historyPaymentFilter') || 'all';

    let filtered = [...orders];

    // Filtro de busca
    if (search) {
      filtered = filtered.filter(o => {
        const customer = this.state.get('customers')?.find(c => c.id === o.customer_id);
        return o.id.toLowerCase().includes(search.toLowerCase()) ||
               customer?.name.toLowerCase().includes(search.toLowerCase());
      });
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Filtro de pagamento
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(o => o.payment_method === paymentFilter);
    }

    // Ordenar por data (mais recente primeiro)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return filtered;
  }

  /**
   * Obtém pedidos paginados
   */
  _getPaginatedOrders(orders) {
    const start = (this.currentPage - 1) * this.ordersPerPage;
    const end = start + this.ordersPerPage;
    return orders.slice(start, end);
  }

  /**
   * Anexa event listeners
   */
  _attachEventListeners() {
    // Busca
    document.getElementById('search-order')?.addEventListener('input', (e) => {
      this.state.set('historySearch', e.target.value);
      this.currentPage = 1;
      this.render();
    });

    // Filtro de status
    document.getElementById('filter-status')?.addEventListener('change', (e) => {
      this.state.set('historyStatusFilter', e.target.value);
      this.currentPage = 1;
      this.render();
    });

    // Filtro de pagamento
    document.getElementById('filter-payment')?.addEventListener('change', (e) => {
      this.state.set('historyPaymentFilter', e.target.value);
      this.currentPage = 1;
      this.render();
    });

    // Limpar filtros
    document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
      this.state.set('historySearch', '');
      this.state.set('historyStatusFilter', 'all');
      this.state.set('historyPaymentFilter', 'all');
      this.currentPage = 1;
      this.render();
    });

    // Paginação
    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.render();
      }
    });

    document.getElementById('next-page-btn')?.addEventListener('click', () => {
      const orders = this._getFilteredOrders(this.state.get('orders') || []);
      const totalPages = Math.ceil(orders.length / this.ordersPerPage);
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

    // Visualizar pedido
    document.querySelectorAll('.view-order-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        eventBus.emit('order:edit', orderId);
      });
    });

    // Imprimir pedido
    document.querySelectorAll('.print-order-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        eventBus.emit('order:print', orderId);
      });
    });

    // Renderizar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
}
