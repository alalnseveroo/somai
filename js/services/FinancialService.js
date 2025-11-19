/**
 * FinancialService - Serviço para gestão financeira
 */
import { eventBus } from '../core/EventBus.js';

export class FinancialService {
  constructor(dbService, state) {
    this.db = dbService;
    this.state = state;
  }

  /**
   * Carrega despesas
   */
  async loadExpenses() {
    try {
      const userId = this._getUserId();
      const { data, error } = await this.db.client
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      this.state.set('expenses', data || []);
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
      throw error;
    }
  }

  /**
   * Carrega receitas pessoais
   */
  async loadPersonalIncomes() {
    try {
      const userId = this._getUserId();
      const { data, error } = await this.db.client
        .from('personal_incomes')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      this.state.set('personalIncomes', data || []);
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar receitas pessoais:', error);
      throw error;
    }
  }

  /**
   * Cria uma nova despesa
   */
  async createExpense(expenseData) {
    try {
      const userId = this._getUserId();
      
      const newExpense = {
        ...expenseData,
        user_id: userId,
        date: expenseData.date || new Date().toISOString()
      };

      const { data, error } = await this.db.client
        .from('expenses')
        .insert(newExpense)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado
      const expenses = this.state.get('expenses') || [];
      this.state.set('expenses', [data, ...expenses]);
      eventBus.emit('expenses:created', data);

      return data;
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma despesa
   */
  async updateExpense(expenseId, updates) {
    try {
      const { data, error } = await this.db.client
        .from('expenses')
        .update(updates)
        .eq('id', expenseId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado
      const expenses = this.state.get('expenses') || [];
      const index = expenses.findIndex(e => e.id === expenseId);
      if (index !== -1) {
        expenses[index] = data;
        this.state.set('expenses', [...expenses]);
      }
      eventBus.emit('expenses:updated', data);

      return data;
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      throw error;
    }
  }

  /**
   * Deleta uma despesa
   */
  async deleteExpense(expenseId) {
    try {
      const { error } = await this.db.client
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      // Atualizar estado
      const expenses = this.state.get('expenses') || [];
      this.state.set('expenses', expenses.filter(e => e.id !== expenseId));
      eventBus.emit('expenses:deleted', { id: expenseId });

      return true;
    } catch (error) {
      console.error('Erro ao deletar despesa:', error);
      throw error;
    }
  }

  /**
   * Cria uma receita pessoal
   */
  async createPersonalIncome(incomeData) {
    try {
      const userId = this._getUserId();
      
      const newIncome = {
        ...incomeData,
        user_id: userId,
        date: incomeData.date || new Date().toISOString()
      };

      const { data, error } = await this.db.client
        .from('personal_incomes')
        .insert(newIncome)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado
      const incomes = this.state.get('personalIncomes') || [];
      this.state.set('personalIncomes', [data, ...incomes]);
      eventBus.emit('personal_incomes:created', data);

      return data;
    } catch (error) {
      console.error('Erro ao criar receita pessoal:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma receita pessoal
   */
  async updatePersonalIncome(incomeId, updates) {
    try {
      const { data, error } = await this.db.client
        .from('personal_incomes')
        .update(updates)
        .eq('id', incomeId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado
      const incomes = this.state.get('personalIncomes') || [];
      const index = incomes.findIndex(i => i.id === incomeId);
      if (index !== -1) {
        incomes[index] = data;
        this.state.set('personalIncomes', [...incomes]);
      }
      eventBus.emit('personal_incomes:updated', data);

      return data;
    } catch (error) {
      console.error('Erro ao atualizar receita pessoal:', error);
      throw error;
    }
  }

  /**
   * Deleta uma receita pessoal
   */
  async deletePersonalIncome(incomeId) {
    try {
      const { error } = await this.db.client
        .from('personal_incomes')
        .delete()
        .eq('id', incomeId);

      if (error) throw error;

      // Atualizar estado
      const incomes = this.state.get('personalIncomes') || [];
      this.state.set('personalIncomes', incomes.filter(i => i.id !== incomeId));
      eventBus.emit('personal_incomes:deleted', { id: incomeId });

      return true;
    } catch (error) {
      console.error('Erro ao deletar receita pessoal:', error);
      throw error;
    }
  }

  /**
   * Calcula resumo financeiro
   */
  calculateFinancialSummary(startDate = null, endDate = null) {
    const orders = this.state.get('orders') || [];
    const expenses = this.state.get('expenses') || [];
    const incomes = this.state.get('personalIncomes') || [];

    // Filtrar por período se fornecido
    const filterByDate = (items, dateField = 'created_at') => {
      if (!startDate && !endDate) return items;
      
      return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        if (startDate && itemDate < new Date(startDate)) return false;
        if (endDate && itemDate > new Date(endDate)) return false;
        return true;
      });
    };

    const filteredOrders = filterByDate(orders.filter(o => o.status !== 'Cancelado'));
    const filteredExpenses = filterByDate(expenses, 'date');
    const filteredIncomes = filterByDate(incomes, 'date');

    const summary = {
      // Receitas
      totalRevenue: filteredOrders.reduce((sum, o) => sum + o.total_value, 0),
      revenueByPayment: (() => {
        const normalize = (m) => {
          const s = (m || '').toString().toLowerCase();
          if (s.includes('dinheiro')) return 'dinheiro';
          if (s.includes('cartão') || s.includes('cartao') || s.includes('crédito') || s.includes('debito') || s.includes('débito')) return 'cartao';
          if (s.includes('pix')) return 'pix';
          return 'outro';
        };
        return filteredOrders.reduce((acc, o) => {
          const key = normalize(o.payment_method);
          const val = o.total_value || 0;
          if (key === 'dinheiro') acc.dinheiro += val;
          else if (key === 'cartao') acc.cartao += val;
          else if (key === 'pix') acc.pix += val;
          return acc;
        }, { dinheiro: 0, cartao: 0, pix: 0 });
      })(),
      
      // Despesas
      totalExpenses: filteredExpenses.reduce((sum, e) => sum + (e.value != null ? e.value : (e.amount != null ? e.amount : 0)), 0),
      expensesByCategory: this._groupByCategory(filteredExpenses),
      
      // Receitas Pessoais
      totalPersonalIncome: filteredIncomes.reduce((sum, i) => sum + i.value, 0),
      
      // Lucro
      profit: 0
    };

    summary.profit = summary.totalRevenue - summary.totalExpenses;

    return summary;
  }

  /**
   * Agrupa despesas por categoria
   */
  _groupByCategory(expenses) {
    return expenses.reduce((acc, expense) => {
      const category = expense.category || 'Outros';
      acc[category] = (acc[category] || 0) + (expense.value != null ? expense.value : (expense.amount != null ? expense.amount : 0));
      return acc;
    }, {});
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
