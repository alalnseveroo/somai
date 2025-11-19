import { eventBus } from '../core/EventBus.js';

/**
 * CustomerService - Serviço para gerenciamento de clientes
 */
export class CustomerService {
  constructor(dbService, appState) {
    this.db = dbService;
    this.state = appState;
  }

  /**
   * Cria um novo cliente
   */
  async create(customerData) {
    this._validate(customerData);

    const data = {
      ...customerData
    };

    const customer = await this.db.insert('customers', data);
    eventBus.emit('customer:created', customer);
    return customer;
  }

  /**
   * Atualiza um cliente
   */
  async update(customerId, customerData) {
    this._validate(customerData);
    
    const customer = await this.db.update('customers', customerId, customerData);
    eventBus.emit('customer:updated', customer);
    return customer;
  }

  /**
   * Remove um cliente
   */
  async delete(customerId) {
    await this.db.delete('customers', customerId);
    eventBus.emit('customer:deleted', customerId);
    return true;
  }

  /**
   * Busca todos os clientes
   */
  async getAll() {
    return this.db.fetchTable('customers', {
      tenantId: this.state.get('tenantId'),
      orderBy: { column: 'name', ascending: true }
    });
  }

  /**
   * Busca cliente por ID
   */
  async getById(customerId) {
    return this.db.findById('customers', customerId);
  }

  /**
   * Busca clientes por nome
   */
  async searchByName(name) {
    const customers = this.state.get('customers') || [];
    const searchTerm = name.toLowerCase();
    
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Formata endereço completo
   */
  formatAddress(customer) {
    if (!customer) return 'Sem endereço';
    
    const parts = [
      customer.address,
      customer.numero,
      customer.bairro,
      customer.complemento
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Sem endereço';
  }

  /**
   * Valida dados do cliente
   */
  _validate(customerData) {
    const errors = [];

    // Aceita nome completo ou nome e sobrenome separados
    const hasFullName = customerData.name && customerData.name.trim() !== '';
    const hasFirstAndLastName = customerData.first_name && customerData.last_name && 
                               customerData.first_name.trim() !== '' && customerData.last_name.trim() !== '';
    
    if (!hasFullName && !hasFirstAndLastName) {
      errors.push('Nome é obrigatório');
    }

    if (customerData.phone && !this._isValidPhone(customerData.phone)) {
      errors.push('Telefone inválido');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  /**
   * Valida formato de telefone
   */
  _isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  }

  /**
   * Obtém ID do usuário
   */
  _getUserId() {
    const isEmployee = this.state.get('isEmployee');
    const ownerUserId = this.state.get('ownerUserId');
    const currentUser = this.state.get('currentUser');

    return isEmployee ? ownerUserId : currentUser?.id;
  }
}
