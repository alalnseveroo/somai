/**
 * FinancialsView - View para gestão financeira
 */
import { eventBus } from '../../core/EventBus.js';
import { formatCurrency, formatDate, maskCurrency, getNumericValue } from '../../utils/helpers.js';
import { modal } from '../components/Modal.js';

export class FinancialsView {
  constructor(state, services) {
    this.state = state;
    this.services = services;
  }

  /**
   * Renderiza a página financeira
   */
  render() {
    const page = document.getElementById('page-financials');
    if (!page) return;

    page.innerHTML = `
      <div class="space-y-6">
        ${this._renderHeader()}
        ${this._renderPeriodFilter()}
        ${this._renderPerformanceChart()}
        ${this._renderFinancialSummary()}
        ${this._renderExpensesAndIncomes()}
      </div>
    `;

    this._attachEventListeners();
  }

  /**
   * Renderiza cabeçalho
   */
  _renderHeader() {
    const viewMode = this.state.get('viewMode') || 'empresa';
    const isPersonal = viewMode === 'pessoal';
    const role = this.state.getUserRole();
    const isBarber = role === 'barbeiro';

    return `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-slate-900">
              ${isPersonal ? 'Finanças Pessoais' : 'Gestão Financeira'}
            </h2>
            <p class="text-sm text-slate-600 mt-1">
              ${isPersonal ? 'Controle suas receitas e despesas pessoais' : 'Visão geral do desempenho financeiro'}
            </p>
          </div>
          <div class="flex gap-2">
            ${!isPersonal && !isBarber ? `
              <button id="add-expense-btn" 
                      class="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg 
                             hover:bg-red-700 transition-colors flex items-center gap-2 text-sm">
                <i data-lucide="minus" class="w-4 h-4"></i>
                Nova Despesa
              </button>
              <button id="barber-payment-btn" 
                      class="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg 
                             hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm">
                <i data-lucide="wallet" class="w-4 h-4"></i>
                Pagar Barbeiro
              </button>
            ` : ''}
            ${!isBarber ? `
              <button id="add-income-btn" 
                      class="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg 
                             hover:bg-green-700 transition-colors flex items-center gap-2 text-sm">
                <i data-lucide="plus" class="w-4 h-4"></i>
                Nova Receita
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza filtro de período
   */
  _renderPeriodFilter() {
    return `
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="flex flex-wrap gap-3 items-center">
          <span class="text-sm font-medium text-slate-700">Período:</span>
          <button data-period="today" class="period-btn px-4 py-2 rounded-lg text-sm font-medium 
                                            bg-slate-100 text-slate-700 hover:bg-slate-200">
            Hoje
          </button>
          <button data-period="week" class="period-btn px-4 py-2 rounded-lg text-sm font-medium 
                                           bg-slate-100 text-slate-700 hover:bg-slate-200">
            Esta Semana
          </button>
          <button data-period="month" class="period-btn active px-4 py-2 rounded-lg text-sm font-medium 
                                             bg-indigo-600 text-white">
            Este Mês
          </button>
          <button data-period="all" class="period-btn px-4 py-2 rounded-lg text-sm font-medium 
                                          bg-slate-100 text-slate-700 hover:bg-slate-200">
            Tudo
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza resumo financeiro
   */
  _renderFinancialSummary() {
    const period = this._getPeriodDates();
    const summary = this.services.financial.calculateFinancialSummary(period.start, period.end);
    const viewMode = this.state.get('viewMode') || 'empresa';
    const isPersonal = viewMode === 'pessoal';
    const role = this.state.getUserRole();
    const isBarber = role === 'barbeiro';

    if (isBarber) {
      const expenses = this.state.get('expenses') || [];
      const currentEmployee = this.state.get('employees')?.find(e => e.user_id === this.state.get('currentUser')?.id);
      const myId = currentEmployee?.id || this.state.get('currentEmployee')?.id || null;
      const commissions = expenses.filter(e => e.type === 'comissao' && e.employee_id === myId);
      const payments = expenses.filter(e => e.type === 'pagamento_barbeiro' && e.employee_id === myId);
      const totalCommissions = commissions.reduce((sum, e) => sum + (e.value != null ? e.value : (e.amount != null ? e.amount : 0)), 0);
      const totalPaid = payments.reduce((sum, e) => sum + (e.value != null ? e.value : (e.amount != null ? e.amount : 0)), 0);
      const remaining = Math.max(0, totalCommissions - totalPaid);
      const today = new Date().toISOString().split('T')[0];
      const todayPayments = payments.filter(p => (p.date || '').slice(0, 10) === today);
      const todayTotal = todayPayments.reduce((sum, e) => sum + (e.value != null ? e.value : (e.amount != null ? e.amount : 0)), 0);

      return `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-xl shadow-lg text-white">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium opacity-90">Comissões</h3>
              <i data-lucide="badge-check" class="w-5 h-5 opacity-75"></i>
            </div>
            <p class="text-3xl font-bold">${formatCurrency(totalCommissions)}</p>
          </div>
          <div class="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium opacity-90">Recebido</h3>
              <i data-lucide="banknote" class="w-5 h-5 opacity-75"></i>
            </div>
            <p class="text-3xl font-bold">${formatCurrency(totalPaid)}</p>
          </div>
          <div class="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-xl shadow-lg text-white">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium opacity-90">A Receber</h3>
              <i data-lucide="hourglass" class="w-5 h-5 opacity-75"></i>
            </div>
            <p class="text-3xl font-bold">${formatCurrency(remaining)}</p>
          </div>
          <div class="bg-gradient-to-br from-slate-500 to-slate-600 p-6 rounded-xl shadow-lg text-white">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium opacity-90">Pagamentos Hoje</h3>
              <i data-lucide="calendar" class="w-5 h-5 opacity-75"></i>
            </div>
            <p class="text-3xl font-bold">${formatCurrency(todayTotal)}</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${!isPersonal ? `
          <div class="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium opacity-90">Receitas</h3>
              <i data-lucide="trending-up" class="w-5 h-5 opacity-75"></i>
            </div>
            <p class="text-3xl font-bold">${formatCurrency(summary.totalRevenue)}</p>
            <div class="mt-3 pt-3 border-t border-green-400 border-opacity-30">
              <div class="text-xs space-y-1 opacity-90">
                <div class="flex justify-between">
                  <span>Dinheiro:</span>
                  <span>${formatCurrency(summary.revenueByPayment.dinheiro)}</span>
                </div>
                <div class="flex justify-between">
                  <span>Cartão:</span>
                  <span>${formatCurrency(summary.revenueByPayment.cartao)}</span>
                </div>
                <div class="flex justify-between">
                  <span>Pix:</span>
                  <span>${formatCurrency(summary.revenueByPayment.pix)}</span>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
        
        <div class="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium opacity-90">Despesas</h3>
            <i data-lucide="trending-down" class="w-5 h-5 opacity-75"></i>
          </div>
          <p class="text-3xl font-bold">${formatCurrency(summary.totalExpenses)}</p>
          ${Object.keys(summary.expensesByCategory).length > 0 ? `
            <div class="mt-3 pt-3 border-t border-red-400 border-opacity-30">
              <div class="text-xs space-y-1 opacity-90">
                ${Object.entries(summary.expensesByCategory).slice(0, 3).map(([cat, val]) => `
                  <div class="flex justify-between">
                    <span>${cat}:</span>
                    <span>${formatCurrency(val)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        ${isPersonal ? `
          <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium opacity-90">Receitas Pessoais</h3>
              <i data-lucide="wallet" class="w-5 h-5 opacity-75"></i>
            </div>
            <p class="text-3xl font-bold">${formatCurrency(summary.totalPersonalIncome)}</p>
          </div>
        ` : ''}

        ${!isPersonal ? `
          <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-xl shadow-lg text-white">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium opacity-90">Lucro</h3>
              <i data-lucide="dollar-sign" class="w-5 h-5 opacity-75"></i>
            </div>
            <p class="text-3xl font-bold">${formatCurrency(summary.profit)}</p>
            <div class="mt-3 pt-3 border-t border-indigo-400 border-opacity-30">
              <div class="text-xs opacity-90">
                ${summary.totalRevenue > 0 ? `
                  Margem: ${((summary.profit / summary.totalRevenue) * 100).toFixed(1)}%
                ` : 'Sem vendas no período'}
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Renderiza listas de despesas e receitas
   */
  _renderExpensesAndIncomes() {
    const viewMode = this.state.get('viewMode') || 'empresa';
    const isPersonal = viewMode === 'pessoal';
    const role = this.state.getUserRole();
    const isBarber = role === 'barbeiro';

    if (isBarber) {
      return `
        <div class="grid grid-cols-1 gap-6">
          <div class="bg-white p-6 rounded-xl shadow-sm">
            <h3 class="text-base font-semibold text-slate-900 mb-4">Minhas Comissões</h3>
            ${this._renderExpensesList(true)}
          </div>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 ${!isPersonal ? 'lg:grid-cols-2' : ''} gap-6">
        ${!isPersonal ? `
          <div class="bg-white p-6 rounded-xl shadow-sm">
            <h3 class="text-base font-semibold text-slate-900 mb-4">Despesas Recentes</h3>
            ${this._renderExpensesList()}
          </div>
        ` : ''}

        <div class="bg-white p-6 rounded-xl shadow-sm">
          <h3 class="text-base font-semibold text-slate-900 mb-4">
            ${isPersonal ? 'Receitas Pessoais' : 'Receitas Extras'}
          </h3>
          ${this._renderIncomesList()}
        </div>
        ${!isPersonal ? `
          <div class="bg-white p-6 rounded-xl shadow-sm">
            <h3 class="text-base font-semibold text-slate-900 mb-4">Comissões a Pagar</h3>
            ${this._renderCommissionsOutstanding()}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Renderiza lista de despesas
   */
  _renderExpensesList(onlyCommissions = false) {
    const period = this._getPeriodDates();
    const expenses = this.state.get('expenses') || [];
    const role = this.state.getUserRole();
    const isBarber = role === 'barbeiro';
    
    let filteredExpenses = expenses;
    if (onlyCommissions) {
      const currentEmployee = this.state.get('employees')?.find(e => e.user_id === this.state.get('currentUser')?.id);
      const myId = currentEmployee?.id || this.state.get('currentEmployee')?.id || null;
      filteredExpenses = filteredExpenses.filter(e => e.type === 'comissao' && e.employee_id === myId);
    }
    if (period.start || period.end) {
      filteredExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        if (period.start && expenseDate < new Date(period.start)) return false;
        if (period.end && expenseDate > new Date(period.end)) return false;
        return true;
      });
    }

    filteredExpenses = filteredExpenses.slice(0, 10);

    if (filteredExpenses.length === 0) {
      return `<p class="text-slate-500 text-center py-8 text-sm">Nenhuma despesa no período</p>`;
    }

    return `
      <div class="space-y-2">
        ${filteredExpenses.map(expense => `
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <div class="flex-1">
              <p class="text-sm font-medium text-slate-900">${expense.description || 'Sem descrição'}</p>
              <div class="flex items-center gap-2 mt-1">
                ${expense.category ? `
                  <span class="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                    ${expense.category}
                  </span>
                ` : ''}
                <span class="text-xs text-slate-500">${formatDate(expense.date)}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-red-600">${formatCurrency(expense.value != null ? expense.value : (expense.amount != null ? expense.amount : 0))}</span>
              ${expense.type === 'comissao' || (isBarber && expense.type === 'pagamento_barbeiro') ? '' : `
                <button data-expense-id="${expense.id}" class="delete-expense-btn text-slate-400 hover:text-red-600">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Renderiza lista de receitas
   */
  _renderIncomesList() {
    const period = this._getPeriodDates();
    const incomes = this.state.get('personalIncomes') || [];
    const role = this.state.getUserRole();
    const isBarber = role === 'barbeiro';
    
    let filteredIncomes = incomes;
    if (period.start || period.end) {
      filteredIncomes = incomes.filter(i => {
        const incomeDate = new Date(i.date);
        if (period.start && incomeDate < new Date(period.start)) return false;
        if (period.end && incomeDate > new Date(period.end)) return false;
        return true;
      });
    }

    filteredIncomes = filteredIncomes.slice(0, 10);

    if (filteredIncomes.length === 0) {
      return `<p class="text-slate-500 text-center py-8 text-sm">Nenhuma receita no período</p>`;
    }

    return `
      <div class="space-y-2">
        ${filteredIncomes.map(income => `
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <div class="flex-1">
              <p class="text-sm font-medium text-slate-900">${income.description || 'Sem descrição'}</p>
              <span class="text-xs text-slate-500">${formatDate(income.date)}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-green-600">${formatCurrency(income.value)}</span>
              ${isBarber ? '' : `
                <button data-income-id="${income.id}" class="delete-income-btn text-slate-400 hover:text-red-600">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Obtém datas do período selecionado
   */
  _getPeriodDates() {
    const period = this.state.get('financialPeriod') || 'month';
    const now = new Date();
    
    switch (period) {
      case 'today':
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const endOfDay = new Date(now.setHours(23, 59, 59, 999));
        return { start: startOfDay.toISOString(), end: endOfDay.toISOString() };
      
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return { start: startOfWeek.toISOString(), end: null };
      
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfMonth.toISOString(), end: null };
      
      case 'all':
      default:
        return { start: null, end: null };
    }
  }

  /**
   * Anexa event listeners
   */
  _attachEventListeners() {
    // Filtros de período
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const period = e.currentTarget.dataset.period;
        this.state.set('financialPeriod', period);
        
        document.querySelectorAll('.period-btn').forEach(b => {
          b.classList.remove('active', 'bg-indigo-600', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        
        e.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
        e.currentTarget.classList.remove('bg-slate-100', 'text-slate-700');
        
        this.render();
      });
    });

    // Adicionar despesa
    document.getElementById('add-expense-btn')?.addEventListener('click', () => {
      this._showExpenseForm();
    });

    document.getElementById('barber-payment-btn')?.addEventListener('click', () => {
      this._showBarberPaymentForm();
    });

    // Adicionar receita
    document.getElementById('add-income-btn')?.addEventListener('click', () => {
      this._showIncomeForm();
    });

    // Deletar despesa
    document.querySelectorAll('.delete-expense-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const expenseId = e.currentTarget.dataset.expenseId;
        const expenses = this.state.get('expenses') || [];
        const expense = expenses.find(x => String(x.id) === String(expenseId));
        const role = this.state.getUserRole();
        const isBarber = role === 'barbeiro';
        if (expense && (expense.type === 'comissao' || (isBarber && expense.type === 'pagamento_barbeiro'))) {
          eventBus.emit('toast:show', { 
            message: 'Não é permitido excluir este lançamento', 
            isError: true 
          });
          return;
        }
        if (confirm('Tem certeza que deseja deletar esta despesa?')) {
          try {
            await this.services.financial.deleteExpense(expenseId);
            eventBus.emit('toast:show', { 
              message: 'Despesa deletada com sucesso!', 
              isError: false 
            });
            this.render();
          } catch (error) {
            eventBus.emit('toast:show', { 
              message: 'Erro ao deletar despesa', 
              isError: true 
            });
          }
        }
      });
    });

    // Deletar receita
    document.querySelectorAll('.delete-income-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const incomeId = e.currentTarget.dataset.incomeId;
        
        if (confirm('Tem certeza que deseja deletar esta receita?')) {
          try {
            await this.services.financial.deletePersonalIncome(incomeId);
            eventBus.emit('toast:show', { 
              message: 'Receita deletada com sucesso!', 
              isError: false 
            });
            this.render();
          } catch (error) {
            eventBus.emit('toast:show', { 
              message: 'Erro ao deletar receita', 
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

  _renderCommissionsOutstanding() {
    const expenses = this.state.get('expenses') || [];
    const employees = this.state.get('employees') || [];
    const barbers = employees.filter(e => e.role === 'barbeiro');
    const items = barbers.map(b => {
      const commissions = expenses.filter(e => e.type === 'comissao' && e.employee_id === b.id);
      const payments = expenses.filter(e => e.type === 'pagamento_barbeiro' && e.employee_id === b.id);
      const totalCom = commissions.reduce((sum, e) => sum + (e.value != null ? e.value : (e.amount != null ? e.amount : 0)), 0);
      const totalPay = payments.reduce((sum, e) => sum + (e.value != null ? e.value : (e.amount != null ? e.amount : 0)), 0);
      const remaining = Math.max(0, totalCom - totalPay);
      return { name: b.name || 'Barbeiro', remaining };
    }).filter(i => i.remaining > 0);
    if (items.length === 0) {
      return `<p class="text-slate-500 text-sm">Nenhuma comissão pendente</p>`;
    }
    return `
      <div class="space-y-2">
        ${items.slice(0, 10).map(i => `
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span class="text-sm font-medium text-slate-900">${i.name}</span>
            <span class="text-sm font-bold text-amber-600">${formatCurrency(i.remaining)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  _showBarberPaymentForm() {
    const employees = this.state.get('employees') || [];
    const barbers = employees.filter(e => e.role === 'barbeiro');
    const content = `
      <form id="barber-payment-form" class="space-y-4">
        <div>
          <label for="barber-select" class="block text-sm font-medium text-slate-700 mb-2">Barbeiro *</label>
          <select id="barber-select" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" required>
            <option value="">Selecione...</option>
            ${barbers.map(b => `<option value="${b.id}">${b.name || 'Barbeiro'}</option>`).join('')}
          </select>
          <div id="barber-info" class="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hidden">
            <div class="flex items-center gap-3">
              <div id="barber-avatar" class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold"></div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span id="barber-name" class="text-sm font-semibold text-slate-900"></span>
                  <span class="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Barbeiro</span>
                </div>
                <div class="text-xs text-slate-600 mt-1">
                  Comissão pendente: <span id="barber-remaining" class="font-semibold text-amber-600"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="barber-payment-value" class="block text-sm font-medium text-slate-700 mb-2">Valor *</label>
            <input type="text" id="barber-payment-value" required class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="R$ 0,00">
          </div>
          <div>
            <label for="barber-payment-date" class="block text-sm font-medium text-slate-700 mb-2">Data *</label>
            <input type="date" id="barber-payment-date" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
          </div>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" id="cancel-barber-payment-btn" class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-300 transition-colors text-sm">Cancelar</button>
          <button type="submit" class="flex-1 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm">Registrar Pagamento</button>
        </div>
      </form>
    `;
    modal.open('Pagamento ao Barbeiro', content, { size: 'medium' });
    const form = document.getElementById('barber-payment-form');
    const valueInput = document.getElementById('barber-payment-value');
    const cancelBtn = document.getElementById('cancel-barber-payment-btn');
    const selectEl = document.getElementById('barber-select');
    const infoEl = document.getElementById('barber-info');
    const avatarEl = document.getElementById('barber-avatar');
    const nameEl = document.getElementById('barber-name');
    const remainingEl = document.getElementById('barber-remaining');
    valueInput?.addEventListener('input', maskCurrency);
    cancelBtn?.addEventListener('click', () => modal.close());
    selectEl?.addEventListener('change', () => {
      const barberId = selectEl.value;
      const b = barbers.find(x => String(x.id) === String(barberId));
      if (!b) {
        infoEl.classList.add('hidden');
        return;
      }
      const expenses = this.state.get('expenses') || [];
      const commissions = expenses.filter(e => e.type === 'comissao' && String(e.employee_id) === String(b.id));
      const payments = expenses.filter(e => e.type === 'pagamento_barbeiro' && String(e.employee_id) === String(b.id));
      const getVal = (e) => (e.value != null ? e.value : (e.amount != null ? e.amount : 0));
      const totalCom = commissions.reduce((sum, e) => sum + getVal(e), 0);
      const totalPay = payments.reduce((sum, e) => sum + getVal(e), 0);
      const remaining = Math.max(0, totalCom - totalPay);
      nameEl.textContent = b.name || 'Barbeiro';
      avatarEl.innerHTML = b.avatar_url || b.avatar || b.photo_url 
        ? `<img src="${b.avatar_url || b.avatar || b.photo_url}" class="w-10 h-10 rounded-full object-cover" />`
        : `<span>${(b.name || 'B').charAt(0).toUpperCase()}</span>`;
      remainingEl.textContent = formatCurrency(remaining);
      infoEl.classList.remove('hidden');
      if (remaining > 0) {
        valueInput.value = formatCurrency(remaining);
      }
    });
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const barberId = document.getElementById('barber-select').value;
      const valueMasked = document.getElementById('barber-payment-value').value;
      const date = document.getElementById('barber-payment-date').value;
      if (!barberId || !date) {
        eventBus.emit('toast:show', { message: 'Preencha todos os campos obrigatórios', isError: true });
        return;
      }
      const value = getNumericValue(valueMasked);
      if (isNaN(value) || value <= 0) {
        eventBus.emit('toast:show', { message: 'Informe um valor válido', isError: true });
        return;
      }
      try {
        const employees2 = this.state.get('employees') || [];
        const barber = employees2.find(e => String(e.id) === String(barberId));
        const description = `Pagamento Barbeiro ${barber?.name || ''}`.trim();
        await this.services.financial.createExpense({ description, value, date, type: 'pagamento_barbeiro', employee_id: barberId });
        eventBus.emit('toast:show', { message: 'Pagamento registrado com sucesso', isError: false });
        modal.close();
        this.render();
      } catch (err) {
        eventBus.emit('toast:show', { message: 'Erro ao registrar pagamento', isError: true });
      }
    });
  }

  /**
   * Exibe formulário de despesa
   */
  _showExpenseForm() {
    const content = `
      <form id="expense-form" class="space-y-4">
        <div>
          <label for="expense-description" class="block text-sm font-medium text-slate-700 mb-2">
            Descrição *
          </label>
          <input type="text" 
                 id="expense-description" 
                 required 
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="Ex: Aluguel, Compras, etc.">
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="expense-value" class="block text-sm font-medium text-slate-700 mb-2">
              Valor *
            </label>
            <input type="text" 
                   id="expense-value" 
                   required 
                   class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="R$ 0,00">
          </div>
          
          <div>
            <label for="expense-category" class="block text-sm font-medium text-slate-700 mb-2">
              Categoria
            </label>
            <select id="expense-category" 
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="">Selecione...</option>
              <option value="aluguel">Aluguel</option>
              <option value="compras">Compras</option>
              <option value="salários">Salários</option>
              <option value="manutenção">Manutenção</option>
              <option value="impostos">Impostos</option>
              <option value="outros">Outros</option>
            </select>
          </div>
        </div>
        
        <div>
          <label for="expense-date" class="block text-sm font-medium text-slate-700 mb-2">
            Data *
          </label>
          <input type="date" 
                 id="expense-date" 
                 required 
                 value="${new Date().toISOString().split('T')[0]}"
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
        </div>
        
        <div class="flex gap-3 pt-4">
          <button type="button" 
                  id="cancel-expense-btn"
                  class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-slate-300 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" 
                  class="flex-1 bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-red-700 transition-colors text-sm">
            Registrar Despesa
          </button>
        </div>
      </form>
    `;

    modal.open('Nova Despesa', content, { size: 'medium' });

    // Event listeners
    const form = document.getElementById('expense-form');
    const valueInput = document.getElementById('expense-value');
    const cancelBtn = document.getElementById('cancel-expense-btn');

    valueInput?.addEventListener('input', maskCurrency);
    cancelBtn?.addEventListener('click', () => modal.close());

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleExpenseSubmit();
    });
  }

  /**
   * Exibe formulário de receita
   */
  _showIncomeForm() {
    const content = `
      <form id="income-form" class="space-y-4">
        <div>
          <label for="income-description" class="block text-sm font-medium text-slate-700 mb-2">
            Descrição *
          </label>
          <input type="text" 
                 id="income-description" 
                 required 
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="Ex: Pagamento, Venda, etc.">
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="income-value" class="block text-sm font-medium text-slate-700 mb-2">
              Valor *
            </label>
            <input type="text" 
                   id="income-value" 
                   required 
                   class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="R$ 0,00">
          </div>
          
          <div>
            <label for="income-date" class="block text-sm font-medium text-slate-700 mb-2">
              Data *
            </label>
            <input type="date" 
                   id="income-date" 
                   required 
                   value="${new Date().toISOString().split('T')[0]}"
                   class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
          </div>
        </div>
        
        <div class="flex gap-3 pt-4">
          <button type="button" 
                  id="cancel-income-btn"
                  class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-slate-300 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" 
                  class="flex-1 bg-green-600 text-white font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-green-700 transition-colors text-sm">
            Registrar Receita
          </button>
        </div>
      </form>
    `;

    modal.open('Nova Receita', content, { size: 'medium' });

    // Event listeners
    const form = document.getElementById('income-form');
    const valueInput = document.getElementById('income-value');
    const cancelBtn = document.getElementById('cancel-income-btn');

    valueInput?.addEventListener('input', maskCurrency);
    cancelBtn?.addEventListener('click', () => modal.close());

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleIncomeSubmit();
    });
  }

  /**
   * Processa envio do formulário de despesa
   */
  async _handleExpenseSubmit() {
    try {
      const description = document.getElementById('expense-description').value.trim();
      const valueInput = document.getElementById('expense-value').value;
      const category = document.getElementById('expense-category').value;
      const date = document.getElementById('expense-date').value;

      if (!description || !date) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, preencha todos os campos obrigatórios', 
          isError: true 
        });
        return;
      }

      const value = getNumericValue(valueInput);
      if (isNaN(value) || value <= 0) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, insira um valor válido', 
          isError: true 
        });
        return;
      }

      const expenseData = { description, value, category, date };

      await this.services.financial.createExpense(expenseData);
      eventBus.emit('toast:show', { 
        message: 'Despesa registrada com sucesso!', 
        isError: false 
      });

      modal.close();
      this.render();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      eventBus.emit('toast:show', { 
        message: 'Erro ao salvar despesa: ' + error.message, 
        isError: true 
      });
    }
  }

  /**
   * Processa envio do formulário de receita
   */
  async _handleIncomeSubmit() {
    try {
      const description = document.getElementById('income-description').value.trim();
      const valueInput = document.getElementById('income-value').value;
      const date = document.getElementById('income-date').value;

      if (!description || !date) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, preencha todos os campos obrigatórios', 
          isError: true 
        });
        return;
      }

      const value = getNumericValue(valueInput);
      if (isNaN(value) || value <= 0) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, insira um valor válido', 
          isError: true 
        });
        return;
      }

      const incomeData = { description, value, date };

      await this.services.financial.createPersonalIncome(incomeData);
      eventBus.emit('toast:show', { 
        message: 'Receita registrada com sucesso!', 
        isError: false 
      });

      modal.close();
      this.render();
    } catch (error) {
      console.error('Erro ao salvar receita:', error);
      eventBus.emit('toast:show', { 
        message: 'Erro ao salvar receita: ' + error.message, 
        isError: true 
      });
    }
  }
  
  _renderPerformanceChart() {
    const role = this.state.getUserRole();
    const isBarber = role === 'barbeiro';
    const chartType = this.state.get('chartType') || 'line';
    const granularity = this.state.get('chartGranularity') || 'months';
    const series = this._getRevenueSeries(granularity, isBarber);
    const svg = this._renderChartSVG(series, chartType);
    const kpis = this._renderKPIs(series);
    return `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div class="flex flex-wrap gap-2">
            <button data-chart-type="line" class="chart-type-btn px-3 py-1.5 rounded ${chartType==='line'?'bg-indigo-600 text-white':'bg-slate-100 text-slate-800'} text-sm">Linha</button>
            <button data-chart-type="bar" class="chart-type-btn px-3 py-1.5 rounded ${chartType==='bar'?'bg-indigo-600 text-white':'bg-slate-100 text-slate-800'} text-sm">Barras</button>
            <span class="mx-2 w-px h-5 bg-slate-200"></span>
            ${['days','weeks','months','quarters','years'].map(g => `
              <button data-chart-granularity="${g}" class="chart-gran-btn px-3 py-1.5 rounded ${granularity===g?'bg-slate-200 text-slate-900':'bg-slate-100 text-slate-700'} text-sm">
                ${g==='days'?'Dias':g==='weeks'?'Semanas':g==='months'?'Meses':g==='quarters'?'Trimestres':'Anos'}
              </button>
            `).join('')}
          </div>
          <button id="export-chart-btn" class="px-3 py-1.5 rounded bg-slate-100 text-slate-800 text-sm">Exportar</button>
        </div>
        <div class="overflow-x-auto">
          ${svg}
        </div>
        <div class="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          ${kpis}
        </div>
      </div>
    `;
  }

  _getRevenueSeries(granularity, isBarber) {
    const orders = (this.state.get('orders') || []).filter(o => o.status === 'Concluído');
    const employees = this.state.get('employees') || [];
    const currentUser = this.state.get('currentUser');
    const myId = isBarber ? (employees.find(e => e.user_id === currentUser?.id)?.id || this.state.get('currentEmployee')?.id || null) : null;
    const filtered = isBarber ? orders.filter(o => (o.employee_id === myId || o.barbeiro_id === myId)) : orders;
    const now = new Date();
    const points = [];
    const addPoint = (label, start, end) => {
      const total = filtered.filter(o => {
        const d = new Date(o.created_at);
        return d >= start && d <= end;
      }).reduce((sum, o) => sum + (o.total_value || 0), 0);
      points.push({ label, value: total });
    };
    if (granularity === 'days') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const start = new Date(year, month, d, 0, 0, 0, 0);
        const end = new Date(year, month, d, 23, 59, 59, 999);
        addPoint(d.toString().padStart(2, '0'), start, end);
      }
    } else if (granularity === 'weeks') {
      for (let i = 11; i >= 0; i--) {
        const end = new Date(now);
        end.setDate(end.getDate() - (i*7));
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        addPoint(`Sem ${12-i}`, start, end);
      }
    } else if (granularity === 'months') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        addPoint(date.toLocaleString('pt-BR', { month: 'short' }), start, end);
      }
    } else if (granularity === 'quarters') {
      for (let i = 3; i >= 0; i--) {
        const qEndMonth = (Math.floor(now.getMonth()/3)*3) - (i*3) + 2;
        const qYear = now.getFullYear();
        const start = new Date(qYear, qEndMonth-2, 1);
        const end = new Date(qYear, qEndMonth+1, 0, 23, 59, 59, 999);
        addPoint(`T${4-i}`, start, end);
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        addPoint(String(year), start, end);
      }
    }
    return points;
  }

  _renderChartSVG(series, chartType) {
    const w = 800; const h = 260; const p = 30;
    const values = series.map(s => s.value);
    const max = Math.max(1, ...values);
    const scaleX = (i) => p + (i*(w-2*p))/(series.length-1 || 1);
    const scaleY = (v) => h - p - ((v/max)*(h-2*p));
    if (chartType === 'bar') {
      const bw = (w-2*p)/(series.length || 1) - 4;
      const bars = series.map((s, i) => `<rect x="${p + i*((w-2*p)/(series.length||1))}" y="${scaleY(s.value)}" width="${bw}" height="${h - p - scaleY(s.value)}" fill="#4f46e5" opacity="0.8" />`).join('');
      const labels = series.map((s, i) => `<text x="${scaleX(i)}" y="${h-8}" font-size="10" text-anchor="middle" fill="#64748b">${s.label}</text>`).join('');
      return `<svg width="${w}" height="${h}">${bars}${labels}</svg>`;
    }
    const path = series.map((s, i) => `${i===0?'M':'L'} ${scaleX(i)} ${scaleY(s.value)}`).join(' ');
    const dots = series.map((s, i) => `<circle cx="${scaleX(i)}" cy="${scaleY(s.value)}" r="3" fill="#4f46e5" />`).join('');
    const labels = series.map((s, i) => `<text x="${scaleX(i)}" y="${h-8}" font-size="10" text-anchor="middle" fill="#64748b">${s.label}</text>`).join('');
    return `<svg width="${w}" height="${h}"><path d="${path}" fill="none" stroke="#4f46e5" stroke-width="2" />${dots}${labels}</svg>`;
  }

  _renderKPIs(series) {
    const fmt = (v) => formatCurrency(v || 0);
    const dash = this.services?.order?.getDashboardData ? this.services.order.getDashboardData() : null;
    const current = dash?.current?.value || 0;
    const startMonth = dash?.startMonth?.value || 0;
    const prev30 = dash?.prev30?.value || 0;
    const prevYear = dash?.prevYear?.value || 0;
    const item = (label, val) => `
      <div class="bg-slate-50 p-4 rounded-lg">
        <p class="text-xs text-slate-500">${label}</p>
        <p class="text-xl font-bold text-slate-900">${fmt(val)}</p>
      </div>`;
    return [
      item('Atual', current),
      item('No início do mês', startMonth),
      item('30 dias atrás', prev30),
      item('1 ano atrás', prevYear)
    ].join('');
  }
}
