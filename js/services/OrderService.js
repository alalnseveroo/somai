import { eventBus } from '../core/EventBus.js';

/**
 * OrderService - Serviço para gerenciamento de pedidos
 */
export class OrderService {
  constructor(dbService, appState) {
    this.db = dbService;
    this.state = appState;
  }

  /**
   * Cria um novo pedido
   */
  async create(orderData) {
    this._validateOrder(orderData);

    const userId = this._getUserId();
    const employeeId = this._getEmployeeId();
    const total = this._calculateTotal(orderData);
    
    // Garantir que sempre tenha uma sessão de caixa ativa
    const activeCashSession = this.state.get('activeCashSession');
    if (!activeCashSession) {
      throw new Error('Nenhuma sessão de caixa ativa. Abra o caixa antes de criar pedidos.');
    }

    const dataToInsert = {
      user_id: userId,
      employee_id: employeeId,
      customer_id: orderData.is_internal_consumption ? null : orderData.customer_id,
      total_value: orderData.is_internal_consumption ? 0 : total,
      payment_method: orderData.is_internal_consumption ? null : orderData.payment_method,
      status: orderData.is_internal_consumption ? 'Concluído' : 'Pendente',
      is_delivery: orderData.is_delivery || false,
      delivery_cost: orderData.delivery_cost || 0,
      notes: orderData.notes || '',
      is_internal_consumption: orderData.is_internal_consumption || false,
      motoboy_id: orderData.motoboy_id || null,
      caixa_sessao_id: activeCashSession.id
    };

    const order = await this.db.insert('orders', dataToInsert);

    // Salvar itens do pedido
    if (orderData.items && orderData.items.length > 0) {
      await this._saveOrderItems(order.id, orderData.items);
    }

    eventBus.emit('order:created', order);
    return order;
  }

  /**
   * Atualiza um pedido existente
   */
  async update(orderId, updates) {
    const existing = await this.db.findById('orders', orderId);
    
    if (updates.items) {
      updates.total_value = this._calculateTotal(updates);
    }

    const order = await this.db.update('orders', orderId, updates);

    // Atualizar itens se fornecidos
    if (updates.items) {
      await this._deleteOrderItems(orderId);
      await this._saveOrderItems(orderId, updates.items);
    }

    // Deduzir estoque somente quando o pedido é concluído (apenas na transição)
    if (updates.status === 'Concluído' && existing.status !== 'Concluído') {
      try {
        let items = updates.items;
        if (!items || items.length === 0) {
          items = await this.db.query('order_items', q => q.eq('order_id', orderId));
          // Mapear para o formato esperado
          items = (items || []).map(i => ({ product_id: i.product_id, quantity: i.quantity }));
        }
        if (items && items.length > 0 && this.services?.inventory) {
          await this.services.inventory.deductStockFromSale(items);
        }
      } catch (e) {
        console.warn('Falha ao deduzir estoque ao concluir pedido:', e);
      }
      await this._registerCommissionForOrder(orderId);
    } else if (updates.status === 'Concluído') {
      await this._registerCommissionForOrder(orderId);
    }
    eventBus.emit('order:updated', order);
    return order;
  }

  /**
   * Marca pedido como concluído
   */
  async markAsDelivered(orderId, motoboyId = null) {
    const updates = {
      status: 'Concluído',
      delivered_at: new Date().toISOString()
    };

    if (motoboyId) {
      updates.motoboy_id = motoboyId;
    }

    return this.update(orderId, updates);
  }

  /**
   * Cancela um pedido
   */
  async cancel(orderId, reason = null) {
    const updates = {
      status: 'Cancelado',
      cancelled_at: new Date().toISOString()
    };

    if (reason) {
      updates.cancellation_reason = reason;
    }

    const order = await this.update(orderId, updates);
    eventBus.emit('order:cancelled', order);
    return order;
  }

  /**
   * Reembolsa um pedido
   */
  async refund(orderId) {
    const order = await this.db.findById('orders', orderId);

    if (order.status !== 'Concluído') {
      throw new Error('Apenas pedidos concluídos podem ser reembolsados');
    }

    // Criar despesa de reembolso
    await this.db.insert('expenses', {
      user_id: this._getUserId(),
      description: `Reembolso do Pedido #${orderId}`,
      amount: order.total_value,
      date: new Date().toISOString().split('T')[0],
      type: 'empresa'
    });

    const updated = await this.update(orderId, {
      status: 'Reembolsado',
      refunded_at: new Date().toISOString()
    });

    eventBus.emit('order:refunded', updated);
    return updated;
  }

  /**
   * Busca pedidos pendentes
   */
  async getPending() {
    const userId = this._getUserId();
    return this.db.fetchTable('orders', {
      userId,
      filters: { status: 'Pendente' },
      orderBy: { column: 'created_at', ascending: false }
    });
  }

  /**
   * Busca pedidos por cliente
   */
  async getByCustomer(customerId) {
    const userId = this._getUserId();
    return this.db.fetchTable('orders', {
      userId,
      filters: { customer_id: customerId },
      orderBy: { column: 'created_at', ascending: false }
    });
  }

  /**
   * Busca pedidos do dia atual
   */
  async getToday() {
    const today = new Date().toISOString().split('T')[0];
    const userId = this._getUserId();
    
    return this.db.query('orders', query => {
      return query
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });
    });
  }

  /**
   * Obtém estatísticas de pedidos
   */
  getStats(orders = null) {
    if (!orders) {
      orders = this.state.get('orders') || [];
    }

    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'Pendente').length,
      delivered: orders.filter(o => o.status === 'Concluído').length,
      cancelled: orders.filter(o => o.status === 'Cancelado').length,
      revenue: orders
        .filter(o => o.status === 'Concluído')
        .reduce((sum, o) => sum + (o.total_value || 0), 0)
    };
  }

  /**
   * Série diária de faturamento para últimos N dias
   */
  getDailyRevenueSeries(days = 365) {
    const orders = this.state.get('orders') || [];
    const completed = orders.filter(o => o.status === 'Concluído' && o.created_at);

    const sumByDate = new Map();
    completed.forEach(o => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const v = o.total_value || 0;
      sumByDate.set(key, (sumByDate.get(key) || 0) + v);
    });

    const today = new Date();
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      series.push({ date: d, value: sumByDate.get(key) || 0 });
    }

    return series;
  }

  /**
   * KPIs do painel baseados na série diária
   */
  getDashboardData() {
    const series = this.getDailyRevenueSeries(365);
    const lastIdx = series.length - 1;
    const last = series[lastIdx];
    const prev30 = series[Math.max(0, lastIdx - 30)];

    const monthStart = new Date(last.date.getFullYear(), last.date.getMonth(), 1);
    const monthStartKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth()+1).padStart(2,'0')}-${String(monthStart.getDate()).padStart(2,'0')}`;
    const monthStartItem = series.find(s => `${s.date.getFullYear()}-${String(s.date.getMonth()+1).padStart(2,'0')}-${String(s.date.getDate()).padStart(2,'0')}` === monthStartKey) || { value: 0 };

    const prevYearIdx = Math.max(0, lastIdx - 365);
    const prevYear = series[prevYearIdx] || { value: 0 };

    const pct = (a, b) => {
      if (!b || b === 0) return 0;
      return ((a - b) / b) * 100;
    };

    return {
      series,
      current: last,
      prev30,
      startMonth: monthStartItem,
      prevYear,
      delta30: pct(last.value, prev30.value),
      deltaStartMonth: pct(last.value, monthStartItem.value),
      deltaYear: pct(last.value, prevYear.value)
    };
  }

  /**
   * Calcula o total do pedido
   */
  _calculateTotal(orderData) {
    if (orderData.is_internal_consumption) return 0;

    const itemsTotal = (orderData.items || []).reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + (price * qty);
    }, 0);

    const delivery = Number(orderData.delivery_cost) || 0;
    return itemsTotal + delivery;
  }

  /**
   * Valida dados do pedido
   */
  _validateOrder(orderData) {
    const errors = [];

    if (!orderData.is_internal_consumption && !orderData.customer_id) {
      errors.push('Cliente é obrigatório');
    }

    if (!orderData.items || orderData.items.length === 0) {
      errors.push('Adicione pelo menos um item ao pedido');
    }

    if (orderData.items) {
      orderData.items.forEach((item, index) => {
        if (!item.product_id) {
          errors.push(`Item ${index + 1}: produto inválido`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: quantidade inválida`);
        }
        if (item.price === undefined || item.price < 0) {
          errors.push(`Item ${index + 1}: preço inválido`);
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  /**
   * Salva itens do pedido
   */
  async _saveOrderItems(orderId, items) {
    const itemsData = items.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.price,
      user_id: this._getUserId()
    }));

    return this.db.insertMany('order_items', itemsData);
  }

  /**
   * Remove itens do pedido
   */
  async _deleteOrderItems(orderId) {
    await this.db.client
      .from('order_items')
      .delete()
      .eq('order_id', orderId);
  }

  /**
   * Registra comissão do barbeiro
   */
  async _registerCommissionForOrder(orderId) {
    const order = await this.db.findById('orders', orderId);
    const employeeId = order?.employee_id || null;
    if (!employeeId) return;

    const employees = this.state.get('employees') || [];
    const employee = employees.find(e => e.id === employeeId);
    if (!employee || employee.role !== 'barbeiro') return;
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

  /**
   * Obtém ID do funcionário logado
   */
  _getEmployeeId() {
    const employees = this.state.get('employees') || [];
    const currentUser = this.state.get('currentUser');
    
    const employee = employees.find(e => e.user_id === currentUser?.id);
    return employee?.id || null;
  }
}
