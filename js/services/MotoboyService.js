/**
 * MotoboyService - Serviço para gestão de motoboys
 */
export class MotoboyService {
  constructor(dbService, state) {
    this.db = dbService;
    this.state = state;
  }

  /**
   * Carrega todos os motoboys
   */
  async loadMotoboys() {
    try {
      const userId = this._getUserId();
      const { data, error } = await this.db.client
        .from('motoboys')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      
      this.state.set('motoboys', data || []);
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar motoboys:', error);
      throw error;
    }
  }

  /**
   * Cria um novo motoboy
   */
  async createMotoboy(motoboyData) {
    try {
      const userId = this._getUserId();
      
      const newMotoboy = {
        ...motoboyData,
        user_id: userId
      };

      const { data, error } = await this.db.client
        .from('motoboys')
        .insert(newMotoboy)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado
      const motoboys = this.state.get('motoboys') || [];
      this.state.set('motoboys', [...motoboys, data]);

      return data;
    } catch (error) {
      console.error('Erro ao criar motoboy:', error);
      throw error;
    }
  }

  /**
   * Atualiza um motoboy
   */
  async updateMotoboy(motoboyId, updates) {
    try {
      const { data, error } = await this.db.client
        .from('motoboys')
        .update(updates)
        .eq('id', motoboyId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado
      const motoboys = this.state.get('motoboys') || [];
      const index = motoboys.findIndex(m => m.id === motoboyId);
      if (index !== -1) {
        motoboys[index] = data;
        this.state.set('motoboys', [...motoboys]);
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar motoboy:', error);
      throw error;
    }
  }

  /**
   * Deleta um motoboy
   */
  async deleteMotoboy(motoboyId) {
    try {
      const { error } = await this.db.client
        .from('motoboys')
        .delete()
        .eq('id', motoboyId);

      if (error) throw error;

      // Atualizar estado
      const motoboys = this.state.get('motoboys') || [];
      this.state.set('motoboys', motoboys.filter(m => m.id !== motoboyId));

      return true;
    } catch (error) {
      console.error('Erro ao deletar motoboy:', error);
      throw error;
    }
  }

  /**
   * Calcula total a pagar para um motoboy
   */
  calculateMotoboyPayment(motoboyId) {
    const orders = this.state.get('orders') || [];
    const activeCashSession = this.state.get('activeCashSession');
    
    // Filtrar pedidos do motoboy na sessão ativa
    const motoboyOrders = orders.filter(o => 
      o.motoboy_id === motoboyId &&
      o.caixa_sessao_id === activeCashSession?.id &&
      o.status === 'Concluído' &&
      !o.motoboy_paid
    );

    const totalDeliveries = motoboyOrders.length;
    const totalDeliveryCost = motoboyOrders.reduce((sum, o) => sum + (o.delivery_cost || 0), 0);

    // Assumindo que o motoboy recebe 50% do custo de entrega
    const paymentPercentage = 0.5;
    const totalToPay = totalDeliveryCost * paymentPercentage;

    return {
      totalDeliveries,
      totalDeliveryCost,
      totalToPay,
      orderIds: motoboyOrders.map(o => o.id)
    };
  }

  /**
   * Marca pedidos como pagos ao motoboy
   */
  async markOrdersAsPaid(orderIds) {
    try {
      const { error } = await this.db.client
        .from('orders')
        .update({ motoboy_paid: true })
        .in('id', orderIds);

      if (error) throw error;

      // Atualizar estado
      const orders = this.state.get('orders') || [];
      const updatedOrders = orders.map(o => 
        orderIds.includes(o.id) ? { ...o, motoboy_paid: true } : o
      );
      this.state.set('orders', updatedOrders);

      return true;
    } catch (error) {
      console.error('Erro ao marcar pedidos como pagos:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de entregas por motoboy
   */
  getMotoboyStats(motoboyId, startDate = null, endDate = null) {
    const orders = this.state.get('orders') || [];
    
    let motoboyOrders = orders.filter(o => o.motoboy_id === motoboyId);

    // Filtrar por período se fornecido
    if (startDate || endDate) {
      motoboyOrders = motoboyOrders.filter(o => {
        const orderDate = new Date(o.created_at);
        if (startDate && orderDate < new Date(startDate)) return false;
        if (endDate && orderDate > new Date(endDate)) return false;
        return true;
      });
    }

    const stats = {
      totalDeliveries: motoboyOrders.length,
      deliveredOrders: motoboyOrders.filter(o => o.status === 'Concluído').length,
      pendingOrders: motoboyOrders.filter(o => o.status === 'Pendente').length,
      totalEarnings: motoboyOrders
        .filter(o => o.status === 'Concluído')
        .reduce((sum, o) => sum + (o.delivery_cost || 0) * 0.5, 0),
      paidOrders: motoboyOrders.filter(o => o.motoboy_paid).length,
      unpaidOrders: motoboyOrders.filter(o => o.status === 'Concluído' && !o.motoboy_paid).length
    };

    return stats;
  }

  /**
   * Obtém todos os pagamentos pendentes por motoboy
   */
  getAllPendingPayments() {
    const motoboys = this.state.get('motoboys') || [];
    const activeCashSession = this.state.get('activeCashSession');
    
    if (!activeCashSession) return [];

    return motoboys.map(motoboy => ({
      ...motoboy,
      ...this.calculateMotoboyPayment(motoboy.id)
    })).filter(m => m.totalToPay > 0);
  }

  /**
   * Obtém ID do usuário correto (considerando funcionário)
   */
  _getUserId() {
    const isEmployee = this.state.get('isEmployee');
    return isEmployee 
      ? this.state.get('ownerUserId')
      : this.state.get('currentUser')?.id;
  }
}
