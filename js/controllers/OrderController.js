import { eventBus } from '../core/EventBus.js';
import { showLoading, hideLoading, showToast, formatCurrency } from '../utils/helpers.js';
import { modal } from '../ui/components/Modal.js';

/**
 * OrderController - Controller para gerenciar a criação e manipulação de pedidos
 */
export class OrderController {
  constructor(orderService, customerService, productService, appState) {
    this.orderService = orderService;
    this.customerService = customerService;
    this.productService = productService;
    this.state = appState;
    
    this.currentOrder = {
      customer_id: null,
      items: [],
      payment_method: 'Dinheiro',
      is_delivery: false,
      delivery_cost: 0,
      notes: '',
      is_internal_consumption: false
    };
    
    this._bindEvents();
  }

  /**
   * Vincula eventos do sistema
   */
  _bindEvents() {
    // Escutar eventos de criação de pedido
    eventBus.on('order:create', () => {
      this.showCreateOrderModal();
    });
    
    eventBus.on('order:edit', (orderId) => {
      this.showEditOrderModal(orderId);
    });
  }

  /**
   * Exibe modal para criar novo pedido
   */
  showCreateOrderModal() {
    this.currentOrder = {
      customer_id: null,
      items: [],
      payment_method: 'Dinheiro',
      is_delivery: false,
      delivery_cost: 0,
      notes: '',
      is_internal_consumption: false
    };
    
    this._renderOrderForm();
  }

  /**
   * Exibe modal para editar pedido existente
   */
  async showEditOrderModal(orderId) {
    try {
      showLoading();
      
      // Buscar pedido existente
      const order = await this.orderService.db.findById('orders', orderId);
      if (!order) {
        throw new Error('Pedido não encontrado');
      }
      
      // Buscar itens do pedido
      const orderItems = await this.orderService.db.query('order_items', query => 
        query.eq('order_id', orderId)
      );
      
      this.currentOrder = {
        ...order,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.unit_price
        }))
      };
      
      this._renderOrderForm(true);
    } catch (error) {
      console.error('Erro ao carregar pedido:', error);
      showToast('Erro ao carregar pedido: ' + error.message, true);
    } finally {
      hideLoading();
    }
  }

  /**
   * Renderiza formulário de pedido
   */
  _renderOrderForm(isEditing = false) {
    const title = isEditing ? 'Editar Pedido' : 'Novo Pedido';
    const customers = this.state.get('customers') || [];
    const products = this.state.get('products') || [];
    
    const content = `
      <div class="space-y-6">
        <!-- Toggle consumo interno -->
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-slate-700">Consumo Interno</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="internal-consumption-toggle" class="sr-only peer" 
                   ${this.currentOrder.is_internal_consumption ? 'checked' : ''}>
            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
        
        <!-- Cliente -->
        <div id="customer-section" class="${this.currentOrder.is_internal_consumption ? 'hidden' : ''}">
          <label class="block text-sm font-medium text-slate-700 mb-2">Cliente</label>
          <select id="order-customer" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
            <option value="">Selecione um cliente</option>
            ${customers.map(customer => `
              <option value="${customer.id}" ${this.currentOrder.customer_id === customer.id ? 'selected' : ''}>
                ${customer.name}
              </option>
            `).join('')}
          </select>
        </div>
        
        <!-- Produtos -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-slate-700">Produtos/Serviços</label>
            <button type="button" id="add-item-btn" 
                    class="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1">
              <i data-lucide="plus" class="w-4 h-4"></i>
              Adicionar Item
            </button>
          </div>
          
          <div id="order-items-container" class="space-y-3">
            ${this.currentOrder.items.length > 0 
              ? this.currentOrder.items.map((item, index) => this._renderOrderItem(item, index)).join('') 
              : '<p class="text-slate-500 text-sm text-center py-4">Nenhum item adicionado</p>'
            }
          </div>
        </div>
        
        <!-- Entrega -->
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-slate-700">Entrega</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="delivery-toggle" class="sr-only peer" 
                   ${this.currentOrder.is_delivery ? 'checked' : ''}>
            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
        
        <!-- Custo de entrega -->
        <div id="delivery-cost-section" class="${this.currentOrder.is_delivery ? '' : 'hidden'}">
          <label class="block text-sm font-medium text-slate-700 mb-2">Custo de Entrega</label>
          <input type="text" id="delivery-cost" 
                 value="${this.currentOrder.delivery_cost > 0 ? formatCurrency(this.currentOrder.delivery_cost) : ''}"
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="R$ 0,00">
        </div>
        
        <!-- Método de pagamento -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Método de Pagamento</label>
          <select id="payment-method" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
            <option value="Dinheiro" ${this.currentOrder.payment_method === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
            <option value="Cartão" ${this.currentOrder.payment_method === 'Cartão' ? 'selected' : ''}>Cartão</option>
            <option value="Pix" ${this.currentOrder.payment_method === 'Pix' ? 'selected' : ''}>Pix</option>
          </select>
        </div>
        
        <!-- Observações -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Observações</label>
          <textarea id="order-notes" rows="3" 
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Observações adicionais...">${this.currentOrder.notes || ''}</textarea>
        </div>
        
        <!-- Total -->
        <div class="bg-slate-50 p-4 rounded-lg">
          <div class="flex justify-between items-center">
            <span class="font-medium text-slate-700">Total:</span>
            <span id="order-total" class="text-xl font-bold text-slate-900">
              ${formatCurrency(this._calculateTotal())}
            </span>
          </div>
        </div>
        
        <!-- Botões -->
        <div class="flex gap-3 pt-4">
          <button type="button" id="cancel-order-btn"
                  class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-300 transition-colors text-sm">
            Cancelar
          </button>
          <button type="button" id="save-order-btn"
                  class="flex-1 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm">
            ${isEditing ? 'Atualizar Pedido' : 'Criar Pedido'}
          </button>
        </div>
      </div>
    `;
    
    modal.open(title, content, { size: 'large' });
    this._attachFormEventListeners();
    
    // Recriar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Renderiza item do pedido
   */
  _renderOrderItem(item, index) {
    const products = this.state.get('products') || [];
    const product = products.find(p => p.id === item.product_id);
    
    return `
      <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg" data-item-index="${index}">
        <div class="flex-1">
          <select class="product-select w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
            <option value="">Selecione um produto</option>
            ${products.map(p => `
              <option value="${p.id}" data-price="${p.price}" ${p.id === item.product_id ? 'selected' : ''}>
                ${p.name} - ${formatCurrency(p.price)}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="w-20">
          <input type="number" 
                 class="quantity-input w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-center"
                 value="${item.quantity}" 
                 min="1">
        </div>
        
        <div class="w-24 text-right font-medium text-slate-700">
          ${formatCurrency((item.price || 0) * (item.quantity || 0))}
        </div>
      
        <button type="button" class="remove-item-btn text-red-500 hover:text-red-700">
          <i data-lucide="trash-2" class="w-5 h-5"></i>
        </button>
      </div>
      ${product && !product.is_product && Number(product.commission || 0) > 0 ? `
        <div class="flex justify-end text-xs text-slate-500 mt-1" data-item-index="${index}">
          <span>Comissão por serviço: <span class="font-semibold text-indigo-600">${formatCurrency(product.commission)}</span>${item.quantity > 1 ? ` × ${item.quantity} = <span class='font-semibold text-indigo-700'>${formatCurrency(Number(product.commission) * Number(item.quantity || 1))}</span>` : ''}</span>
        </div>
      ` : ''}
    `;
  }

  /**
   * Anexa event listeners ao formulário
   */
  _attachFormEventListeners() {
    // Toggle consumo interno
    document.getElementById('internal-consumption-toggle')?.addEventListener('change', (e) => {
      this.currentOrder.is_internal_consumption = e.target.checked;
      document.getElementById('customer-section').classList.toggle('hidden', e.target.checked);
      
      if (e.target.checked) {
        this.currentOrder.customer_id = null;
        document.getElementById('order-customer').value = '';
      }
      
      this._updateTotal();
    });
    
    // Seleção de cliente
    document.getElementById('order-customer')?.addEventListener('change', (e) => {
      this.currentOrder.customer_id = e.target.value || null;
    });
    
    // Toggle entrega
    document.getElementById('delivery-toggle')?.addEventListener('change', (e) => {
      this.currentOrder.is_delivery = e.target.checked;
      document.getElementById('delivery-cost-section').classList.toggle('hidden', !e.target.checked);
      this._updateTotal();
    });
    
    // Custo de entrega
    const deliveryCostInput = document.getElementById('delivery-cost');
    if (deliveryCostInput) {
      deliveryCostInput.addEventListener('input', (e) => {
        // Aplicar máscara de moeda
        let value = e.target.value.replace(/\D/g, '');
        value = (value / 100).toFixed(2);
        e.target.value = value.replace('.', ',');
        this.currentOrder.delivery_cost = parseFloat(value) || 0;
        this._updateTotal();
      });
    }
    
    // Método de pagamento
    document.getElementById('payment-method')?.addEventListener('change', (e) => {
      this.currentOrder.payment_method = e.target.value;
    });
    
    // Observações
    document.getElementById('order-notes')?.addEventListener('input', (e) => {
      this.currentOrder.notes = e.target.value;
    });
    
    // Adicionar item
    document.getElementById('add-item-btn')?.addEventListener('click', () => {
      this.currentOrder.items.push({
        product_id: null,
        quantity: 1,
        price: 0
      });
      this._renderOrderItems();
    });
    
    // Salvar pedido
    document.getElementById('save-order-btn')?.addEventListener('click', () => {
      this._saveOrder();
    });
    
    // Cancelar
    document.getElementById('cancel-order-btn')?.addEventListener('click', () => {
      modal.close();
    });
    
    // Anexar listeners para itens existentes
    this._attachItemEventListeners();
  }

  /**
   * Anexa event listeners aos itens do pedido
   */
  _attachItemEventListeners() {
    // Seleção de produto
    document.querySelectorAll('.product-select').forEach((select, index) => {
      select.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const price = selectedOption ? parseFloat(selectedOption.dataset.price) || 0 : 0;
        
        this.currentOrder.items[index].product_id = e.target.value || null;
        this.currentOrder.items[index].price = price;
        
        this._renderOrderItems();
        this._updateTotal();
      });
    });
    
    // Quantidade
    document.querySelectorAll('.quantity-input').forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const quantity = parseInt(e.target.value) || 1;
        this.currentOrder.items[index].quantity = quantity;
        this._updateItemTotal(index);
        this._updateTotal();
      });
    });
    
    // Remover item
    document.querySelectorAll('.remove-item-btn').forEach((button, index) => {
      button.addEventListener('click', () => {
        this.currentOrder.items.splice(index, 1);
        this._renderOrderItems();
        this._updateTotal();
      });
    });
  }

  /**
   * Renderiza itens do pedido
   */
  _renderOrderItems() {
    const container = document.getElementById('order-items-container');
    if (!container) return;
    
    if (this.currentOrder.items.length === 0) {
      container.innerHTML = '<p class="text-slate-500 text-sm text-center py-4">Nenhum item adicionado</p>';
      return;
    }
    
    container.innerHTML = this.currentOrder.items.map((item, index) => 
      this._renderOrderItem(item, index)
    ).join('');
    
    // Reanexar event listeners
    this._attachItemEventListeners();
    
    // Recriar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Atualiza total de um item
   */
  _updateItemTotal(index) {
    const item = this.currentOrder.items[index];
    const total = (item.price || 0) * (item.quantity || 0);
    
    const itemElement = document.querySelector(`[data-item-index="${index}"]`);
    if (itemElement) {
      const totalElement = itemElement.querySelector('.text-right.font-medium');
      if (totalElement) {
        totalElement.textContent = formatCurrency(total);
      }
    }
  }

  /**
   * Atualiza total do pedido
   */
  _updateTotal() {
    const totalElement = document.getElementById('order-total');
    if (totalElement) {
      totalElement.textContent = formatCurrency(this._calculateTotal());
    }
  }

  /**
   * Calcula total do pedido
   */
  _calculateTotal() {
    if (this.currentOrder.is_internal_consumption) return 0;
    
    const itemsTotal = this.currentOrder.items.reduce((sum, item) => {
      return sum + ((item.price || 0) * (item.quantity || 0));
    }, 0);
    
    return itemsTotal + (this.currentOrder.delivery_cost || 0);
  }

  /**
   * Salva o pedido
   */
  async _saveOrder() {
    try {
      // Validar pedido
      this._validateOrder();
      
      showLoading();
      
      // Salvar pedido
      const order = await this.orderService.create(this.currentOrder);
      
      modal.close();
      showToast('Pedido criado com sucesso!', false);
      
      // Emitir evento de criação (Application atualiza o estado)
      eventBus.emit('order:created', order);
      
      // Mostrar notificação de venda
      if (!this.currentOrder.is_internal_consumption) {
        eventBus.emit('sale:completed', order.total_value);
      }
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      showToast('Erro ao salvar pedido: ' + error.message, true);
    } finally {
      hideLoading();
    }
  }

  /**
   * Valida dados do pedido
   */
  _validateOrder() {
    const errors = [];
    
    // Validar cliente (exceto para consumo interno)
    if (!this.currentOrder.is_internal_consumption && !this.currentOrder.customer_id) {
      errors.push('Selecione um cliente');
    }
    
    // Validar itens
    if (this.currentOrder.items.length === 0) {
      errors.push('Adicione pelo menos um item ao pedido');
    }
    
    // Validar itens individuais
    this.currentOrder.items.forEach((item, index) => {
      if (!item.product_id) {
        errors.push(`Item ${index + 1}: selecione um produto`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: quantidade inválida`);
      }
    });
    
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }
}