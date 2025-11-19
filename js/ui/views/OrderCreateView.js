/**
 * OrderCreateView - View para criação de pedidos
 */
import { eventBus } from '../../core/EventBus.js';
import { formatCurrency, formatDate } from '../../utils/helpers.js';
import { modal } from '../components/Modal.js';

export class OrderCreateView {
  constructor(state, services) {
    this.state = state;
    this.services = services;
  }

  /**
   * Renderiza o formulário de criação de pedidos
   */
  render() {
    // Inicializar estado de itens do pedido
    this.state.set('currentOrderItems', []);
    this.state.set('currentOrderStep', 1);
    this.state.set('currentOrderData', {
      customer_id: null,
      payment_method: 'Dinheiro',
      notes: '',
      is_delivery: false,
      delivery_cost: 0,
      motoboy_id: null,
      is_internal_consumption: false
    });

    this._showStep1();
  }

  /**
   * Renderiza cabeçalho
   */
  _renderHeader() {
    return `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Novo Pedido</h2>
            <p class="text-sm text-slate-600 mt-1">
              Crie um novo pedido para seus clientes
            </p>
          </div>
          <button id="back-to-orders-btn" 
                  class="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg 
                         hover:bg-slate-300 transition-colors flex items-center gap-2 text-sm">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            Voltar
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza formulário de pedido
   */
  _showStep1() {
    const products = this.state.get('products') || [];
    
    const content = `
      <div class="p-6">
        ${this._renderProductsSection(products)}
        
        <div class="mt-8 pt-6 border-t border-slate-200 flex justify-between sticky bottom-0 bg-white">
          <button id="cancel-order-btn" 
                  class="bg-slate-200 text-slate-800 font-semibold py-2.5 px-6 rounded-lg 
                         hover:bg-slate-300 transition-colors text-sm">
            Cancelar
          </button>
          <button id="next-to-step2-btn" 
                  class="bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg 
                         hover:bg-indigo-700 transition-colors text-sm ${this.state.get('currentOrderItems')?.length > 0 ? '' : 'opacity-50 cursor-not-allowed'}"
                  ${this.state.get('currentOrderItems')?.length > 0 ? '' : 'disabled'}>
            Próximo
          </button>
        </div>
      </div>
    `;
    
    modal.open('Novo Pedido', content, { size: 'full' });
    this._attachStep1EventListeners();
  }

  /**
   * Renderiza seção de cliente
   */
  _showStep2() {
    // Garantir que os produtos estejam disponíveis
    const customers = this.state.get('customers') || [];
    const motoboys = this.state.get('motoboys') || [];
    const products = this.state.get('products') || [];
    const orderData = this.state.get('currentOrderData') || {};
    
    // Atualizar o resumo imediatamente ao mostrar a etapa 2
    setTimeout(() => {
      this._updateSummary();
    }, 100);
    
    const content = `
      <div class="p-6">
        <div class="mb-6">
          <h3 class="text-lg font-bold text-slate-900 mb-2">Etapa 2: Cliente e Pagamento</h3>
          <p class="text-sm text-slate-600">Informe os dados do cliente e forma de pagamento</p>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-6">
            ${this._renderCustomerSection(customers)}
            ${this._renderOrderDetails()}
          </div>
          
          <div class="space-y-6">
            ${this._renderDeliverySection(motoboys)}
            ${this._renderSummary()}
          </div>
        </div>
        
        <div class="mt-8 pt-6 border-t border-slate-200 flex justify-between sticky bottom-0 bg-white">
          <button id="back-to-step1-btn" 
                  class="bg-slate-200 text-slate-800 font-semibold py-2.5 px-6 rounded-lg 
                         hover:bg-slate-300 transition-colors text-sm">
            Voltar
          </button>
          <button id="create-order-btn" 
                  class="bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg 
                         hover:bg-indigo-700 transition-colors text-sm">
            Criar Pedido
          </button>
        </div>
      </div>
    `;
    
    modal.open('Novo Pedido', content, { size: 'full' });
    this._attachStep2EventListeners();
  }

  /**
   * Renderiza detalhes do pedido
   */
  _renderOrderDetails() {
    const orderData = this.state.get('currentOrderData') || {};
    
    return `
      <div class="space-y-4">
        <h3 class="text-base font-semibold text-slate-800">Detalhes do Pedido</h3>
        
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="payment-method" class="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label>
            <select id="payment-method" 
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="Dinheiro" ${orderData.payment_method === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
              <option value="Cartão de Crédito" ${orderData.payment_method === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito</option>
              <option value="Cartão de Débito" ${orderData.payment_method === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito</option>
              <option value="PIX" ${orderData.payment_method === 'PIX' ? 'selected' : ''}>PIX</option>
            </select>
          </div>
          
          <div>
            <label for="order-date" class="block text-sm font-medium text-slate-700 mb-1">Data</label>
            <input type="date" id="order-date" 
                   value="${new Date().toISOString().split('T')[0]}"
                   class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   readonly>
          </div>
        </div>
        
        <div id="cash-payment-fields" class="space-y-3" style="display: ${orderData.payment_method === 'Dinheiro' && !orderData.is_internal_consumption ? 'block' : 'none'};">
          <div>
            <label for="amount-received" class="block text-sm font-medium text-slate-700 mb-1">Valor Recebido</label>
            <input type="text" id="amount-received" 
                   class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="R$ 0,00" 
                   value="${orderData.amount_received ? formatCurrency(orderData.amount_received) : ''}">
          </div>
          
          <div class="bg-green-50 p-3 rounded-lg">
            <div class="flex justify-between text-sm">
              <span class="text-green-800 font-medium">Troco:</span>
              <span id="change-amount" class="text-green-900 font-bold">R$ 0,00</span>
            </div>
          </div>
        </div>
        
        <div>
          <label for="order-notes" class="block text-sm font-medium text-slate-700 mb-1">Observações</label>
          <textarea id="order-notes" 
                    rows="3"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Observações sobre o pedido">${orderData.notes || ''}</textarea>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza seção de entrega
   */
  _renderDeliverySection(motoboys) {
    const orderData = this.state.get('currentOrderData') || {};
    
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-slate-800">Entrega</h3>
          <div class="flex items-center">
            <input type="checkbox" id="is-delivery" class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" 
                   ${orderData.is_delivery ? 'checked' : ''}>
            <label for="is-delivery" class="ml-2 text-sm font-medium text-slate-700">É entrega</label>
          </div>
        </div>
        
        <div id="delivery-fields" class="space-y-3" ${orderData.is_delivery ? '' : 'style="display: none;"'}>
          <div>
            <label for="delivery-cost" class="block text-sm font-medium text-slate-700 mb-1">Taxa de Entrega</label>
            <input type="text" id="delivery-cost" 
                   class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="R$ 0,00" 
                   value="${orderData.delivery_cost ? formatCurrency(orderData.delivery_cost) : ''}">
          </div>
          
          <div>
            <label for="motoboy-select" class="block text-sm font-medium text-slate-700 mb-1">Motoboy</label>
            <select id="motoboy-select" 
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="">Selecione um motoboy</option>
              ${motoboys.map(motoboy => `
                <option value="${motoboy.id}" ${orderData.motoboy_id === motoboy.id ? 'selected' : ''}>${motoboy.name}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza seção de produtos
   */
  _renderProductsSection(products) {
    const items = this.state.get('currentOrderItems') || [];
    const term = this.state.get('orderProductSearch') || '';
    const filtered = term
      ? products.filter(p => (p.name || '').toLowerCase().includes(term.toLowerCase()))
      : products;
    return `
      <div class="space-y-4">
        <h3 class="text-base font-semibold text-slate-800">Produtos/Serviços</h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div class="mb-3 relative">
              <input id="order-product-search" type="text" placeholder="Buscar por nome" class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              ${filtered.map(p => this._renderProductCatalogCard(p)).join('')}
            </div>
          </div>
          <div>
            <div class="bg-white rounded-xl shadow-sm p-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-slate-700">Itens adicionados</h4>
                <span class="text-xs text-slate-500">${items.length} itens</span>
              </div>
              <div id="order-items-container" class="space-y-3">
                ${this._renderCartItems(products)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza um item do pedido
   */
  _renderOrderItem(item, index, products) {
    const product = products.find(p => p.id === item.product_id) || {};
    
    return `
      <div class="bg-slate-50 rounded-lg p-4" data-item-index="${index}">
        <div class="grid grid-cols-12 gap-3 items-center">
          <div class="col-span-5">
            <select class="order-item-product w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    data-index="${index}">
              <option value="">Selecione um produto</option>
              ${products.map(p => `
                <option value="${p.id}" ${p.id === item.product_id ? 'selected' : ''}>
                  ${p.name} - ${formatCurrency(p.price)}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="col-span-2">
            <input type="number" 
                   class="order-item-quantity w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   data-index="${index}"
                   value="${item.quantity}"
                   min="1"
                   step="1">
          </div>
          
          <div class="col-span-3 text-right">
            <span class="order-item-total text-sm font-semibold text-slate-900">
              ${formatCurrency((product.price || 0) * item.quantity)}
            </span>
          </div>
          
          <div class="col-span-2 text-right">
            <button type="button" 
                    class="remove-item-btn text-red-600 hover:text-red-700 p-1"
                    data-index="${index}"
                    title="Remover item">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza resumo do pedido
   */
  _renderSummary() {
    return `
      <div class="bg-slate-50 rounded-lg p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2 space-y-2">
            <h4 class="text-sm font-semibold text-slate-700">Resumo</h4>
            <div id="order-summary-items" class="text-sm text-slate-600">
              Nenhum item adicionado
            </div>
          </div>
          
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-slate-600">Subtotal:</span>
              <span id="subtotal-amount" class="font-medium">R$ 0,00</span>
            </div>
            
            <div id="delivery-cost-summary" class="flex justify-between text-sm hidden">
              <span class="text-slate-600">Taxa de Entrega:</span>
              <span id="delivery-cost-amount" class="font-medium">R$ 0,00</span>
            </div>
            
            <div class="flex justify-between text-base font-bold border-t border-slate-200 pt-2">
              <span>Total:</span>
              <span id="total-amount" class="text-lg">R$ 0,00</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza seção de cliente
   */
  _renderCustomerSection(customers) {
    const orderData = this.state.get('currentOrderData') || {};
    
    return `
      <div class="space-y-4">
        <h3 class="text-base font-semibold text-slate-800">Cliente</h3>
        
        <div class="flex items-center space-x-2">
          <input type="checkbox" id="internal-consumption" class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" 
                 ${orderData.is_internal_consumption ? 'checked' : ''}>
          <label for="internal-consumption" class="text-sm font-medium text-slate-700">Consumo Interno</label>
        </div>
        
        <div id="customer-selection" class="space-y-3" ${orderData.is_internal_consumption ? 'style="display: none;"' : ''}>
          <div>
            <label for="customer-select" class="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <select id="customer-select" 
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required>
              <option value="">Selecione um cliente</option>
              ${customers.map(customer => `
                <option value="${customer.id}" ${orderData.customer_id === customer.id ? 'selected' : ''}>${customer.name}</option>
              `).join('')}
            </select>
          </div>
          
          <button type="button" id="add-customer-btn" 
                  class="w-full text-left px-3 py-2 border border-dashed border-slate-300 rounded-lg 
                         text-slate-600 hover:border-indigo-400 hover:text-indigo-600 text-sm">
            <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>
            Adicionar Novo Cliente
          </button>
        </div>
        
        <div id="new-customer-form" class="hidden space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="new-customer-first-name" class="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
              <input type="text" id="new-customer-first-name" 
                     class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                     placeholder="Nome">
            </div>
            
            <div>
              <label for="new-customer-last-name" class="block text-sm font-medium text-slate-700 mb-1">Sobrenome *</label>
              <input type="text" id="new-customer-last-name" 
                     class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                     placeholder="Sobrenome">
            </div>
          </div>
          
          <div class="flex gap-2">
            <button type="button" id="cancel-new-customer-btn" 
                    class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg 
                           hover:bg-slate-300 transition-colors text-sm">
              Cancelar
            </button>
            <button type="button" id="save-new-customer-btn" 
                    class="flex-1 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg 
                           hover:bg-indigo-700 transition-colors text-sm">
              Salvar Cliente
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza ações do formulário
   */
  _renderActions() {
    return `
      <div class="flex justify-end gap-3 mt-6">
        <button type="button" id="cancel-order-btn" 
                class="bg-slate-200 text-slate-800 font-semibold py-2.5 px-6 rounded-lg 
                       hover:bg-slate-300 transition-colors text-sm">
          Cancelar
        </button>
        <button type="submit" 
                class="bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg 
                       hover:bg-indigo-700 transition-colors text-sm">
          Criar Pedido
        </button>
      </div>
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
          Abra o caixa para criar pedidos.
        </p>
        <button id="open-cash-btn" 
                class="mt-4 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg 
                       hover:bg-indigo-700 transition-colors text-sm">
          Abrir Caixa
        </button>
      </div>
    `;
  }

  /**
   * Anexa event listeners para etapa 1
   */
  _attachStep1EventListeners() {
    // Cancelar pedido
    const cancelBtn = document.getElementById('cancel-order-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.close();
      });
    }

    // Próximo passo
    const nextBtn = document.getElementById('next-to-step2-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.state.get('currentOrderItems')?.length > 0) {
          this._showStep2();
        }
      });
    }

    document.querySelectorAll('.product-dec-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.currentTarget.closest('.product-card');
        const qtyEl = card?.querySelector('.product-qty');
        if (qtyEl) {
          const val = Math.max(1, (parseInt(qtyEl.value) || 1) - 1);
          qtyEl.value = val;
        }
      });
    });
    document.querySelectorAll('.product-inc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.currentTarget.closest('.product-card');
        const qtyEl = card?.querySelector('.product-qty');
        if (qtyEl) {
          const val = Math.min(9999, (parseInt(qtyEl.value) || 1) + 1);
          qtyEl.value = val;
        }
      });
    });
    document.querySelectorAll('.product-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.currentTarget.closest('.product-card');
        const productId = parseInt(card?.dataset.productId);
        const qtyEl = card?.querySelector('.product-qty');
        const qty = parseInt(qtyEl?.value) || 1;
        this._addProductToOrder(productId, qty);
      });
    });

    document.querySelectorAll('.cart-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this._removeOrderItem(index);
      });
    });
    document.querySelectorAll('.cart-dec-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        const items = this.state.get('currentOrderItems') || [];
        const qty = Math.max(1, (items[index]?.quantity || 1) - 1);
        this._updateOrderItemQuantity(index, qty);
      });
    });
    document.querySelectorAll('.cart-inc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        const items = this.state.get('currentOrderItems') || [];
        const qty = Math.min(9999, (items[index]?.quantity || 1) + 1);
        this._updateOrderItemQuantity(index, qty);
      });
    });

    // Renderizar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  _renderProductCatalogCard(product) {
    return `
      <div class="product-card bg-white rounded-xl shadow-sm p-5 border border-slate-200 hover:border-indigo-300 transition-colors overflow-hidden space-y-4" data-product-id="${product.id}">
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-semibold text-slate-900 leading-tight line-clamp-2 break-words">${product.name}</h4>
          <span class="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">${product.is_product ? 'Produto' : 'Serviço'}</span>
          <div class="mt-2 text-sm font-bold text-green-600">${formatCurrency(product.price)}</div>
        </div>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <button type="button" class="product-dec-btn w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200">
              <i data-lucide="minus" class="w-4 h-4"></i>
            </button>
            <input type="number" class="product-qty w-16 text-center px-2 py-2 border border-slate-300 rounded-lg" value="1" min="1" step="1">
            <button type="button" class="product-inc-btn w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200">
              <i data-lucide="plus" class="w-4 h-4"></i>
            </button>
          </div>
          <button type="button" class="product-add-btn px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            Adicionar
          </button>
        </div>
      </div>
    `;
  }

  _renderCartItems(products) {
    const items = this.state.get('currentOrderItems') || [];
    if (!items.length) {
      return `<div class="text-sm text-slate-500">Nenhum item adicionado</div>`;
    }
    return items.map((item, index) => {
      const productId = typeof item.product_id === 'string' ? parseInt(item.product_id) : item.product_id;
      const product = products.find(p => p.id === productId) || {};
      const total = (product.price || 0) * (item.quantity || 1);
      return `
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-900">${product.name || 'Item'}</p>
              <p class="text-xs text-slate-500">${formatCurrency(product.price)} cada</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="cart-dec-btn w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200" data-index="${index}">
                <i data-lucide="minus" class="w-4 h-4"></i>
              </button>
              <span class="w-8 text-center text-sm">${item.quantity}</span>
              <button type="button" class="cart-inc-btn w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200" data-index="${index}">
                <i data-lucide="plus" class="w-4 h-4"></i>
              </button>
              <span class="text-sm font-semibold text-slate-900">${formatCurrency(total)}</span>
              <button type="button" class="cart-remove-btn text-red-600 hover:text-red-700 p-1" data-index="${index}">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  _addProductToOrder(productId, quantity) {
    const items = this.state.get('currentOrderItems') || [];
    const products = this.state.get('products') || [];
    const product = products.find(p => p.id === productId) || {};
    const price = Number(product.price) || 0;
    const existingIndex = items.findIndex(i => i.product_id === productId);
    if (existingIndex !== -1) {
      items[existingIndex].quantity = (items[existingIndex].quantity || 1) + quantity;
      items[existingIndex].price = price;
    } else {
      items.push({ product_id: productId, quantity, price });
    }
    this.state.set('currentOrderItems', [...items]);
    this._refreshOrderItems();

    const nextBtn = document.getElementById('next-to-step2-btn');
    if (nextBtn) {
      nextBtn.disabled = items.length === 0;
      nextBtn.classList.toggle('opacity-50', items.length === 0);
      nextBtn.classList.toggle('cursor-not-allowed', items.length === 0);
    }
  }

  /**
   * Anexa event listeners para etapa 2
   */
  _attachStep2EventListeners() {
    // Voltar para etapa 1
    const backBtn = document.getElementById('back-to-step1-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this._showStep1();
      });
    }

    // Criar pedido
    const createBtn = document.getElementById('create-order-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this._handleSubmit();
      });
    }

    // Consumo interno
    const internalConsumption = document.getElementById('internal-consumption');
    if (internalConsumption) {
      internalConsumption.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const customerSelection = document.getElementById('customer-selection');
        if (customerSelection) {
          customerSelection.style.display = isChecked ? 'none' : 'block';
        }
        this._updateSummary();
        
        // Atualizar estado
        const orderData = this.state.get('currentOrderData') || {};
        orderData.is_internal_consumption = isChecked;
        this.state.set('currentOrderData', orderData);
      });
    }

    // Adicionar cliente
    const addCustomerBtn = document.getElementById('add-customer-btn');
    if (addCustomerBtn) {
      addCustomerBtn.addEventListener('click', () => {
        const customerSelection = document.getElementById('customer-selection');
        const newCustomerForm = document.getElementById('new-customer-form');
        if (customerSelection && newCustomerForm) {
          customerSelection.style.display = 'none';
          newCustomerForm.style.display = 'block';
        }
      });
    }

    // Cancelar adição de cliente
    const cancelNewCustomerBtn = document.getElementById('cancel-new-customer-btn');
    if (cancelNewCustomerBtn) {
      cancelNewCustomerBtn.addEventListener('click', () => {
        const customerSelection = document.getElementById('customer-selection');
        const newCustomerForm = document.getElementById('new-customer-form');
        if (customerSelection && newCustomerForm) {
          newCustomerForm.style.display = 'none';
          customerSelection.style.display = 'block';
        }
        this._resetNewCustomerForm();
      });
    }

    // Salvar novo cliente
    const saveNewCustomerBtn = document.getElementById('save-new-customer-btn');
    if (saveNewCustomerBtn) {
      saveNewCustomerBtn.addEventListener('click', () => {
        this._saveNewCustomer();
      });
    }

    // Entrega
    const isDelivery = document.getElementById('is-delivery');
    if (isDelivery) {
      isDelivery.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const deliveryFields = document.getElementById('delivery-fields');
        if (deliveryFields) {
          deliveryFields.style.display = isChecked ? 'block' : 'none';
        }
        this._updateSummary();
        
        // Atualizar estado
        const orderData = this.state.get('currentOrderData') || {};
        orderData.is_delivery = isChecked;
        this.state.set('currentOrderData', orderData);
      });
    }

    // Alterar forma de pagamento
    const paymentMethod = document.getElementById('payment-method');
    if (paymentMethod) {
      paymentMethod.addEventListener('change', (e) => {
        const orderData = this.state.get('currentOrderData') || {};
        orderData.payment_method = e.target.value;
        this.state.set('currentOrderData', orderData);
        this._updateSummary();
      });
    }

    // Alterar motoboy
    const motoboySelect = document.getElementById('motoboy-select');
    if (motoboySelect) {
      motoboySelect.addEventListener('change', (e) => {
        const orderData = this.state.get('currentOrderData') || {};
        orderData.motoboy_id = e.target.value || null;
        this.state.set('currentOrderData', orderData);
      });
    }

    // Alterar taxa de entrega
    const deliveryCost = document.getElementById('delivery-cost');
    if (deliveryCost) {
      deliveryCost.addEventListener('input', (e) => {
        const orderData = this.state.get('currentOrderData') || {};
        orderData.delivery_cost = this._getNumericValue(e.target.value || '0');
        this.state.set('currentOrderData', orderData);
        this._updateSummary();
      });
    }

    // Alterar cliente
    const customerSelect = document.getElementById('customer-select');
    if (customerSelect) {
      customerSelect.addEventListener('change', (e) => {
        const orderData = this.state.get('currentOrderData') || {};
        orderData.customer_id = e.target.value || null;
        this.state.set('currentOrderData', orderData);
      });
    }

    // Alterar observações
    const orderNotes = document.getElementById('order-notes');
    if (orderNotes) {
      orderNotes.addEventListener('input', (e) => {
        const orderData = this.state.get('currentOrderData') || {};
        orderData.notes = e.target.value;
        this.state.set('currentOrderData', orderData);
      });
    }

    // Alterar valor recebido (para cálculo de troco)
    const amountReceived = document.getElementById('amount-received');
    if (amountReceived) {
      amountReceived.addEventListener('input', (e) => {
        const orderData = this.state.get('currentOrderData') || {};
        orderData.amount_received = this._getNumericValue(e.target.value || '0');
        this.state.set('currentOrderData', orderData);
        this._updateSummary();
      });
    }

    // Renderizar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Adiciona um novo item ao pedido
   */
  _addOrderItem() {
    const itemsContainer = document.getElementById('order-items-container');
    if (!itemsContainer) return;
    
    const items = this.state.get('currentOrderItems') || [];
    const products = this.state.get('products') || [];
    
    const newItem = {
      product_id: '',
      quantity: 1,
      price: 0
    };
    
    items.push(newItem);
    this.state.set('currentOrderItems', [...items]);
    
    const index = items.length - 1;
    const itemElement = this._renderOrderItem(newItem, index, products);
    itemsContainer.insertAdjacentHTML('beforeend', itemElement);
    
    // Adicionar event listeners ao novo item
    const newItemElement = itemsContainer.lastElementChild;
    if (newItemElement) {
      const removeBtn = newItemElement.querySelector('.remove-item-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          this._removeOrderItem(index);
        });
      }
      
      const productSelect = newItemElement.querySelector('.order-item-product');
      if (productSelect) {
        productSelect.addEventListener('change', (e) => {
          const productId = e.target.value;
          this._updateOrderItemProduct(index, productId);
        });
      }
      
      const quantityInput = newItemElement.querySelector('.order-item-quantity');
      if (quantityInput) {
        quantityInput.addEventListener('input', (e) => {
          const quantity = parseInt(e.target.value) || 1;
          this._updateOrderItemQuantity(index, quantity);
        });
      }
    }
    
    this._updateSummary();
    
    // Atualizar botão próximo se necessário
    const nextBtn = document.getElementById('next-to-step2-btn');
    if (nextBtn) {
      nextBtn.disabled = items.length === 0;
      nextBtn.classList.toggle('opacity-50', items.length === 0);
      nextBtn.classList.toggle('cursor-not-allowed', items.length === 0);
    }
  }

  /**
   * Remove um item do pedido
   */
  _removeOrderItem(index) {
    const items = this.state.get('currentOrderItems') || [];
    items.splice(index, 1);
    this.state.set('currentOrderItems', [...items]);
    this._refreshOrderItems();
    
    // Atualizar botão próximo se necessário
    const nextBtn = document.getElementById('next-to-step2-btn');
    if (nextBtn) {
      nextBtn.disabled = items.length === 0;
      nextBtn.classList.toggle('opacity-50', items.length === 0);
      nextBtn.classList.toggle('cursor-not-allowed', items.length === 0);
    }
  }

  /**
   * Atualiza o produto de um item
   */
  _updateOrderItemProduct(index, productId) {
    const items = this.state.get('currentOrderItems') || [];
    const products = this.state.get('products') || [];
    // Garantir que o productId seja um número
    const productIdNum = typeof productId === 'string' ? parseInt(productId) : productId;
    const product = products.find(p => p.id === productIdNum) || {};
    
    if (items[index]) {
      items[index].product_id = productIdNum;
      items[index].price = product.price || 0;
      this.state.set('currentOrderItems', [...items]);
      this._refreshOrderItems();
    }
  }

  /**
   * Atualiza a quantidade de um item
   */
  _updateOrderItemQuantity(index, quantity) {
    const items = this.state.get('currentOrderItems') || [];
    
    if (items[index]) {
      items[index].quantity = quantity;
      this.state.set('currentOrderItems', [...items]);
      this._refreshOrderItems();
    }
  }

  /**
   * Atualiza todos os itens do pedido
   */
  _refreshOrderItems() {
    const itemsContainer = document.getElementById('order-items-container');
    if (!itemsContainer) return;
    
    const items = this.state.get('currentOrderItems') || [];
    const products = this.state.get('products') || [];
    
    itemsContainer.innerHTML = this._renderCartItems(products);
    
    itemsContainer.querySelectorAll('.cart-remove-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        this._removeOrderItem(index);
      });
    });
    itemsContainer.querySelectorAll('.cart-dec-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const itemsState = this.state.get('currentOrderItems') || [];
        const qty = Math.max(1, (itemsState[index]?.quantity || 1) - 1);
        this._updateOrderItemQuantity(index, qty);
      });
    });
    itemsContainer.querySelectorAll('.cart-inc-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const itemsState = this.state.get('currentOrderItems') || [];
        const qty = Math.min(9999, (itemsState[index]?.quantity || 1) + 1);
        this._updateOrderItemQuantity(index, qty);
      });
    });
    
    this._updateSummary();
  }

  /**
   * Atualiza o resumo do pedido
   */
  _updateSummary() {
    // Garantir que sempre obtenhamos os dados mais recentes do estado
    const items = this.state.get('currentOrderItems') || [];
    const products = this.state.get('products') || [];
    
    // Obter dados do estado
    const orderData = this.state.get('currentOrderData') || {};
    const isDelivery = orderData.is_delivery || false;
    const deliveryCost = isDelivery ? (orderData.delivery_cost || 0) : 0;
    const isInternalConsumption = orderData.is_internal_consumption || false;
    const paymentMethod = orderData.payment_method || 'Dinheiro';
    
    // Calcular subtotal
    let subtotal = 0;
    const summaryItems = [];
    
    items.forEach(item => {
      // Garantir que o product_id seja um número
      const productId = typeof item.product_id === 'string' ? parseInt(item.product_id) : item.product_id;
      const product = products.find(p => p.id === productId);
      if (product) {
        const itemTotal = (product.price || 0) * item.quantity;
        subtotal += itemTotal;
        summaryItems.push(`${item.quantity}x ${product.name} = ${formatCurrency(itemTotal)}`);
      }
    });
    
    // Atualizar elementos do resumo
    const summaryItemsElement = document.getElementById('order-summary-items');
    if (summaryItemsElement) {
      summaryItemsElement.innerHTML = 
        summaryItems.length > 0 
          ? summaryItems.join('<br>') 
          : 'Nenhum item adicionado';
    }
    
    const subtotalAmountElement = document.getElementById('subtotal-amount');
    if (subtotalAmountElement) {
      subtotalAmountElement.textContent = formatCurrency(subtotal);
    }
    
    const deliverySummary = document.getElementById('delivery-cost-summary');
    const deliveryAmount = document.getElementById('delivery-cost-amount');
    if (deliverySummary && deliveryAmount) {
      if (isDelivery) {
        deliverySummary.classList.remove('hidden');
        deliveryAmount.textContent = formatCurrency(deliveryCost);
      } else {
        deliverySummary.classList.add('hidden');
      }
    }
    
    const total = isInternalConsumption ? 0 : subtotal + deliveryCost;
    const totalAmountElement = document.getElementById('total-amount');
    if (totalAmountElement) {
      totalAmountElement.textContent = formatCurrency(total);
    }
    
    // Mostrar campo de valor recebido e troco apenas para pagamento em dinheiro
    const cashPaymentFields = document.getElementById('cash-payment-fields');
    if (cashPaymentFields) {
      cashPaymentFields.style.display = (paymentMethod === 'Dinheiro' && !isInternalConsumption) ? 'block' : 'none';
    }
    
    // Calcular e mostrar troco se for pagamento em dinheiro
    if (paymentMethod === 'Dinheiro' && !isInternalConsumption) {
      const amountReceivedInput = document.getElementById('amount-received');
      const changeAmountElement = document.getElementById('change-amount');
      
      if (amountReceivedInput && changeAmountElement) {
        const amountReceived = this._getNumericValue(amountReceivedInput.value || '0');
        const change = Math.max(0, amountReceived - total);
        changeAmountElement.textContent = formatCurrency(change);
      }
    }
  }

  /**
   * Reseta o formulário de novo cliente
   */
  _resetNewCustomerForm() {
    const firstNameInput = document.getElementById('new-customer-first-name');
    const lastNameInput = document.getElementById('new-customer-last-name');
    
    if (firstNameInput) firstNameInput.value = '';
    if (lastNameInput) lastNameInput.value = '';
  }

  /**
   * Salva um novo cliente
   */
  async _saveNewCustomer() {
    const firstNameInput = document.getElementById('new-customer-first-name');
    const lastNameInput = document.getElementById('new-customer-last-name');
    
    if (!firstNameInput || !lastNameInput) return;
    
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    
    if (!firstName || !lastName) {
      eventBus.emit('toast:show', {
        message: 'Nome e sobrenome são obrigatórios',
        isError: true
      });
      return;
    }
    
    try {
      // Salvar nome completo no banco de dados
      const fullName = `${firstName} ${lastName}`;
      
      const customerData = {
        name: fullName,
        user_id: this.state.get('currentUser')?.id
      };
      
      const customer = await this.services.customer.create(customerData);
      
      // Adicionar cliente ao estado
      const customers = this.state.get('customers') || [];
      this.state.set('customers', [...customers, customer]);
      
      // Selecionar o novo cliente
      const customerSelect = document.getElementById('customer-select');
      if (customerSelect) {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        option.selected = true;
        customerSelect.appendChild(option);
        
        // Atualizar estado
        const orderData = this.state.get('currentOrderData') || {};
        orderData.customer_id = customer.id;
        this.state.set('currentOrderData', orderData);
      }
      
      // Voltar para seleção de cliente
      const newCustomerForm = document.getElementById('new-customer-form');
      const customerSelection = document.getElementById('customer-selection');
      if (newCustomerForm && customerSelection) {
        newCustomerForm.style.display = 'none';
        customerSelection.style.display = 'block';
      }
      
      this._resetNewCustomerForm();
      
      eventBus.emit('toast:show', {
        message: 'Cliente cadastrado com sucesso!',
        isError: false
      });
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      eventBus.emit('toast:show', {
        message: 'Erro ao cadastrar cliente: ' + error.message,
        isError: true
      });
    }
  }

  /**
   * Converte valor monetário para número
   */
  _getNumericValue(value) {
    if (!value) return 0;
    return parseFloat(value.replace('R$', '').replace('.', '').replace(',', '.')) || 0;
  }

  /**
   * Manipula o envio do formulário
   */
  async _handleSubmit() {
    try {
      const orderData = this._getOrderData();
      
      // Validar dados
      if (!this._validateOrderData(orderData)) {
        return;
      }
      
      // Garantir que sempre tenha uma sessão de caixa ativa
      const activeCashSession = this.state.get('activeCashSession');
      if (!activeCashSession) {
        eventBus.emit('toast:show', {
          message: 'Nenhuma sessão de caixa ativa. Abra o caixa antes de criar pedidos.',
          isError: true
        });
        return;
      }
      
      // Criar pedido
      const order = await this.services.order.create(orderData);
      
      eventBus.emit('toast:show', {
        message: 'Pedido criado com sucesso!',
        isError: false
      });
      
      // Fechar modal
      modal.close();
      
      // Estado será atualizado via evento emitido pelo serviço
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      eventBus.emit('toast:show', {
        message: 'Erro ao criar pedido: ' + error.message,
        isError: true
      });
    }
  }

  /**
   * Obtém dados do formulário
   */
  _getOrderData() {
    const orderData = this.state.get('currentOrderData') || {};
    const items = this.state.get('currentOrderItems') || [];
    const activeCashSession = this.state.get('activeCashSession');
    
    return {
      customer_id: orderData.customer_id,
      payment_method: orderData.payment_method,
      notes: orderData.notes,
      is_delivery: orderData.is_delivery,
      delivery_cost: orderData.delivery_cost,
      motoboy_id: orderData.motoboy_id,
      is_internal_consumption: orderData.is_internal_consumption,
      amount_received: orderData.amount_received,
      caixa_sessao_id: activeCashSession?.id || null,
      items: items.filter(item => item.product_id) // Apenas itens com produto selecionado
    };
  }

  /**
   * Valida dados do pedido
   */
  _validateOrderData(orderData) {
    // Verificar se há uma sessão de caixa ativa
    const activeCashSession = this.state.get('activeCashSession');
    if (!activeCashSession) {
      eventBus.emit('toast:show', {
        message: 'Nenhuma sessão de caixa ativa. Abra o caixa antes de criar pedidos.',
        isError: true
      });
      return false;
    }
    
    if (!orderData.is_internal_consumption && !orderData.customer_id) {
      eventBus.emit('toast:show', {
        message: 'Selecione um cliente ou marque como consumo interno',
        isError: true
      });
      return false;
    }
    
    if (orderData.items.length === 0) {
      eventBus.emit('toast:show', {
        message: 'Adicione pelo menos um item ao pedido',
        isError: true
      });
      return false;
    }
    
    // Validar se todos os itens têm produto selecionado
    for (const item of orderData.items) {
      if (!item.product_id) {
        eventBus.emit('toast:show', {
          message: 'Todos os itens devem ter um produto selecionado',
          isError: true
        });
        return false;
      }
    }
    
    return true;
  }
}
    const searchInput = document.getElementById('order-product-search');
    if (searchInput) {
      searchInput.value = this.state.get('orderProductSearch') || '';
      searchInput.addEventListener('input', (e) => {
        this.state.set('orderProductSearch', e.target.value);
        this._showStep1();
      });
    }