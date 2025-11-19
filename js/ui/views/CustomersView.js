/**
 * CustomersView - View para gestão de clientes
 */
import { eventBus } from '../../core/EventBus.js';
import { formatDateTime } from '../../utils/helpers.js';
import { modal } from '../components/Modal.js';

export class CustomersView {
  constructor(state, services) {
    this.state = state;
    this.services = services;
  }

  /**
   * Renderiza a página de clientes
   */
  render() {
    const page = document.getElementById('page-customers');
    if (!page) return;

    const customers = this.state.get('customers') || [];

    page.innerHTML = `
      <div class="space-y-6">
        ${this._renderHeader(customers)}
        ${this._renderSearchBar()}
        ${this._renderCustomersList(customers)}
      </div>
    `;

    this._attachEventListeners();
  }

  /**
   * Renderiza cabeçalho
   */
  _renderHeader(customers) {
    return `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Clientes</h2>
            <p class="text-sm text-slate-600 mt-1">
              Total de ${customers.length} clientes cadastrados
            </p>
          </div>
          <button id="add-customer-btn" 
                  class="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg 
                         hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            Novo Cliente
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza barra de busca
   */
  _renderSearchBar() {
    return `
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="relative">
          <input type="text" 
                 id="customer-search" 
                 placeholder="Buscar cliente por nome, telefone ou endereço..."
                 class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
          <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza lista de clientes
   */
  _renderCustomersList(customers) {
    const searchTerm = this.state.get('customerSearchTerm') || '';
    
    const filteredCustomers = searchTerm 
      ? customers.filter(c => 
          c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone?.includes(searchTerm) ||
          c.address?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : customers;

    if (filteredCustomers.length === 0) {
      return `
        <div class="bg-white p-8 rounded-xl shadow-sm text-center">
          <i data-lucide="users" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
          <p class="text-slate-500">
            ${searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </p>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${filteredCustomers.map(customer => this._renderCustomerCard(customer)).join('')}
      </div>
    `;
  }

  /**
   * Renderiza card de cliente
   */
  _renderCustomerCard(customer) {
    const orders = this.state.get('orders')?.filter(o => o.customer_id === customer.id) || [];
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.total_value || 0), 0);

    return `
      <div class="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <span class="text-indigo-600 font-bold text-lg">
                ${customer.name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <h3 class="font-bold text-slate-900">${customer.name || 'Sem nome'}</h3>
              <p class="text-xs text-slate-500">
                Desde ${formatDateTime(customer.created_at).split(' ')[0]}
              </p>
            </div>
          </div>
          
          <div class="flex gap-1">
            <button data-customer-id="${customer.id}" 
                    class="edit-customer-btn text-blue-600 hover:text-blue-700 p-1">
              <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <button data-customer-id="${customer.id}" 
                    class="delete-customer-btn text-red-600 hover:text-red-700 p-1">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <div class="space-y-2 text-sm">
          ${customer.phone ? `
            <div class="flex items-center gap-2 text-slate-700">
              <i data-lucide="phone" class="w-4 h-4 text-slate-400"></i>
              <span>${customer.phone}</span>
            </div>
          ` : ''}
          
          ${customer.address ? `
            <div class="flex items-start gap-2 text-slate-700">
              <i data-lucide="map-pin" class="w-4 h-4 text-slate-400 mt-0.5"></i>
              <span class="flex-1">${customer.address}</span>
            </div>
          ` : ''}
        </div>

        <div class="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-center">
          <div>
            <p class="text-xs text-slate-500">Pedidos</p>
            <p class="text-lg font-bold text-slate-900">${totalOrders}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Total Gasto</p>
            <p class="text-lg font-bold text-green-600">
              ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Anexa event listeners
   */
  _attachEventListeners() {
    // Busca
    document.getElementById('customer-search')?.addEventListener('input', (e) => {
      this.state.set('customerSearchTerm', e.target.value);
      this.render();
    });

    // Adicionar cliente
    document.getElementById('add-customer-btn')?.addEventListener('click', () => {
      this._showCustomerForm();
    });

    // Editar cliente
    document.querySelectorAll('.edit-customer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const customerId = e.currentTarget.dataset.customerId;
        const customer = this.state.get('customers')?.find(c => c.id === customerId);
        this._showCustomerForm(customer);
      });
    });

    // Deletar cliente
    document.querySelectorAll('.delete-customer-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const customerId = e.currentTarget.dataset.customerId;
        const customer = this.state.get('customers')?.find(c => c.id === customerId);
        
        if (confirm(`Tem certeza que deseja deletar o cliente ${customer?.name}?`)) {
          try {
            await this.services.customer.delete(customerId);
            eventBus.emit('toast:show', { 
              message: 'Cliente deletado com sucesso!', 
              isError: false 
            });
            this.render();
          } catch (error) {
            eventBus.emit('toast:show', { 
              message: 'Erro ao deletar cliente', 
              isError: true 
            });
          }
        }
      });
    });

    // Renderizar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Exibe formulário de cliente (criar/editar)
   */
  _showCustomerForm(customer = null) {
    const isEdit = !!customer;
    
    const content = `
      <form id="customer-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="customer-first-name" class="block text-sm font-medium text-slate-700 mb-2">
              Nome *
            </label>
            <input type="text" 
                   id="customer-first-name" 
                   required 
                   value="${customer?.first_name || ''}"
                   class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="Primeiro nome">
          </div>
          
          <div>
            <label for="customer-last-name" class="block text-sm font-medium text-slate-700 mb-2">
              Sobrenome *
            </label>
            <input type="text" 
                   id="customer-last-name" 
                   required 
                   value="${customer?.last_name || ''}"
                   class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="Último nome">
          </div>
        </div>
        
        <div class="flex gap-3 pt-4">
          <button type="button" 
                  id="cancel-customer-btn"
                  class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-slate-300 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" 
                  class="flex-1 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-indigo-700 transition-colors text-sm">
            ${isEdit ? 'Atualizar' : 'Cadastrar'}
          </button>
        </div>
      </form>
    `;

    modal.open(isEdit ? 'Editar Cliente' : 'Novo Cliente', content, { size: 'medium' });

    // Event listeners
    const form = document.getElementById('customer-form');
    const cancelBtn = document.getElementById('cancel-customer-btn');

    cancelBtn?.addEventListener('click', () => modal.close());

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleCustomerSubmit(customer?.id);
    });
  }

  /**
   * Processa envio do formulário de cliente
   */
  async _handleCustomerSubmit(customerId = null) {
    try {
      const firstName = document.getElementById('customer-first-name').value.trim();
      const lastName = document.getElementById('customer-last-name').value.trim();

      if (!firstName || !lastName) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, preencha o nome e sobrenome do cliente', 
          isError: true 
        });
        return;
      }

      const customerData = { 
        first_name: firstName, 
        last_name: lastName, 
        name: `${firstName} ${lastName}`
      };

      if (customerId) {
        await this.services.customer.update(customerId, customerData);
        eventBus.emit('toast:show', { 
          message: 'Cliente atualizado com sucesso!', 
          isError: false 
        });
      } else {
        await this.services.customer.create(customerData);
        eventBus.emit('toast:show', { 
          message: 'Cliente cadastrado com sucesso!', 
          isError: false 
        });
      }

      modal.close();
      this.render();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      eventBus.emit('toast:show', { 
        message: 'Erro ao salvar cliente: ' + error.message, 
        isError: true 
      });
    }
  }
}
