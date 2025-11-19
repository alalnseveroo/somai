import { eventBus } from '../core/EventBus.js';
/**
 * CashService - Serviço para gestão de caixa
 */
export class CashService {
  constructor(dbService, state) {
    this.db = dbService;
    this.state = state;
  }

  /**
   * Carrega todas as sessões de caixa
   */
  async loadSessions() {
    try {
      const userId = this._getUserId();
      const { data, error } = await this.db.client
        .from('caixa_sessoes')
        .select('*')
        .eq('user_id', userId)
        .order('data_abertura', { ascending: false });

      if (error) throw error;
      
      this.state.set('cashSessions', data || []);
      
      // Definir sessão ativa
      const activeSession = data?.find(s => !s.data_fechamento);
      this.state.set('activeCashSession', activeSession || null);
      
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar sessões de caixa:', error);
      throw error;
    }
  }

  /**
   * Obtém a sessão ativa
   */
  getActiveSession() {
    return this.state.get('activeCashSession');
  }

  /**
   * Abre uma nova sessão de caixa
   */
  async openSession(valorAbertura) {
    try {
      // Verificar se já existe sessão aberta
      const activeSession = this.getActiveSession();
      if (activeSession) {
        throw new Error('Já existe uma sessão de caixa aberta');
      }

      const userId = this._getUserId();
      
      // Verificar se o usuário tem permissão para abrir caixa
      if (!userId) {
        throw new Error('Usuário não autorizado a abrir caixa');
      }
      
      const newSession = {
        user_id: userId,
        data_abertura: new Date().toISOString(),
        valor_abertura: valorAbertura,
        data_fechamento: null,
        valor_fechamento: null,
        valor_apurado_dinheiro: null
      };

      const { data, error } = await this.db.client
        .from('caixa_sessoes')
        .insert(newSession)
        .select()
        .single();

      if (error) {
        // Tratar erro de permissão de forma mais específica
        if (error.message && error.message.includes('row-level security')) {
          throw new Error('Você não tem permissão para abrir caixa. Contate o administrador.');
        }
        throw error;
      }

      // Atualizar estado
      const sessions = this.state.get('cashSessions') || [];
      this.state.set('cashSessions', [data, ...sessions]);
      this.state.set('activeCashSession', data);

      // Emitir evento para notificar todos os usuários
      eventBus.emit('cash:session-opened', data);

      return data;
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      throw error;
    }
  }

  /**
   * Fecha a sessão de caixa ativa
   */
  async closeSession(valorFechamento) {
    try {
      const activeSession = this.getActiveSession();
      if (!activeSession) {
        throw new Error('Nenhuma sessão de caixa aberta');
      }

      // Calcular total em dinheiro da sessão
      const totalDinheiro = this._calculateCashTotal(activeSession.id);

      const { data, error } = await this.db.client
        .from('caixa_sessoes')
        .update({
          data_fechamento: new Date().toISOString(),
          valor_fechamento: valorFechamento,
          valor_apurado_dinheiro: totalDinheiro
        })
        .eq('id', activeSession.id)
        .select()
        .single();

      if (error) {
        // Tratar erro de permissão de forma mais específica
        if (error.message && error.message.includes('row-level security')) {
          throw new Error('Você não tem permissão para fechar caixa. Contate o administrador.');
        }
        throw error;
      }

      // Atualizar estado
      const sessions = this.state.get('cashSessions') || [];
      const index = sessions.findIndex(s => s.id === activeSession.id);
      if (index !== -1) {
        sessions[index] = data;
        this.state.set('cashSessions', [...sessions]);
      }
      this.state.set('activeCashSession', null);

      // Emitir evento para notificar todos os usuários
      eventBus.emit('cash:session-closed', data);

      return data;
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      throw error;
    }
  }

  /**
   * Calcula estatísticas da sessão ativa
   */
  calculateSessionStats() {
    const activeSession = this.getActiveSession();
    if (!activeSession) {
      return null;
    }

    const orders = this._getSessionOrders(activeSession.id);
    
    const stats = {
      totalOrders: orders.length,
      totalDinheiro: orders
        .filter(o => o.payment_method === 'Dinheiro')
        .reduce((sum, o) => sum + o.total_value, 0),
      totalCartao: orders
        .filter(o => o.payment_method === 'Cartão')
        .reduce((sum, o) => sum + o.total_value, 0),
      totalPix: orders
        .filter(o => o.payment_method === 'Pix')
        .reduce((sum, o) => sum + o.total_value, 0),
      valorAbertura: activeSession.valor_abertura,
      valorEsperado: 0
    };

    stats.valorEsperado = stats.valorAbertura + stats.totalDinheiro;

    return stats;
  }

  /**
   * Calcula total em dinheiro da sessão
   */
  _calculateCashTotal(sessionId) {
    const orders = this._getSessionOrders(sessionId);
    return orders
      .filter(o => o.payment_method === 'Dinheiro')
      .reduce((sum, o) => sum + o.total_value, 0);
  }

  /**
   * Obtém pedidos da sessão
   */
  _getSessionOrders(sessionId) {
    const orders = this.state.get('orders') || [];
    return orders.filter(o => 
      o.caixa_sessao_id === sessionId && 
      o.status !== 'Cancelado'
    );
  }

  /**
   * Obtém histórico de sessões fechadas
   */
  getClosedSessions() {
    const sessions = this.state.get('cashSessions') || [];
    return sessions.filter(s => s.data_fechamento);
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
