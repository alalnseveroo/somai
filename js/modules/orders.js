import { getSupabaseClient } from '../config/supabase.js';
import { formatCurrency, formatDate, formatDateTime, getNumericValue, maskCurrency, showToast, showLoading, hideLoading } from '../utils/helpers.js';
import { renderDashboard, renderDeliveries, renderHistory, renderCustomers, renderProducts, renderInventory, renderFinancials, renderMotoboysPage, renderEmployeesPage, closeAllModals, updateNavigationVisibility } from './ui.js';

// Estado compartilhado
export const state = {
  customers: [],
  products: [],
  orders: [],
  expenses: [],
  personalIncomes: [],
  ingredients: [],
  productIngredients: [],
  orderItems: [],
  motoboys: [],
  cashSessions: [],
  employees: [],
  activeCashSession: null,
  editingOrderId: null,
  currentOrder: {},
  importedImageData: null,
  currentImportType: null,
  scannedProducts: [],
  currentUser: null,
  isChatOpen: false,
  chatHistory: [],
  productFormImageFile: null,
  sessionOrdersCurrentPage: 1,
  viewMode: 'empresa',
  notifications: [],
  hasUnreadNotifications: false,
  users: []
};

export const editingId = { customer: null, product: null, ingredient: null, motoboy: null, employee: null };
export let confirmAction = null;

export const loadData = async () => {
  console.log('🔄 Iniciando carregamento de dados...');

  const db = getSupabaseClient();
  if (!db) return;

  // Verificar se é um funcionário logado
  const employeeSession = localStorage.getItem('employee_session');
  let userId = state.currentUser?.id;
  
  if (employeeSession) {
    const empData = JSON.parse(employeeSession);
    userId = empData.admin_user_id;
    console.log('👤 Funcionário logado - usando user_id do admin:', userId);
  }

  if (!userId) {
    console.error('❌ Nenhum user_id disponível para carregar dados');
    return;
  }

  // Timeout de 30 segundos para evitar travamento
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout: Carregamento de dados demorou mais de 30 segundos')), 30000);
  });

  try {
    await Promise.race([
      (async () => {
        // Carrega dados de forma individual para melhor controle de erros
        const tables = [
          { name: 'customers', query: () => db.from('customers').select('*').eq('user_id', userId).order('name') },
          { name: 'products', query: () => db.from('products').select('*').eq('user_id', userId).order('name') },
          { name: 'orders', query: () => db.from('orders').select('*, customers(*), employees(name)').eq('user_id', userId).order('created_at', { ascending: false }) },
          { name: 'expenses', query: () => db.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }) },
          { name: 'personal_incomes', query: () => db.from('personal_incomes').select('*').eq('user_id', userId).order('date', { ascending: false }) },
          { name: 'ingredients', query: () => db.from('ingredients').select('*').eq('user_id', userId).order('name') },
          { name: 'product_ingredients', query: () => db.from('product_ingredients').select('*, ingredients(name, unit)').eq('user_id', userId) },
          { name: 'order_items', query: () => db.from('order_items').select('*, products(id, name, category)').eq('user_id', userId) },
          { name: 'motoboys', query: () => db.from('motoboys').select('*').eq('user_id', userId).order('name') },
          { name: 'caixa_sessoes', query: () => db.from('caixa_sessoes').select('*').eq('user_id', userId).order('data_abertura', { ascending: false }) },
          { name: 'employees', query: () => db.from('employees').select('*').eq('user_id', userId).order('name') }
        ];

        const results = [];

        for (const table of tables) {
          try {
            console.log(`📊 Carregando tabela: ${table.name}`);
            const result = await table.query();

            if (result.error) {
              console.warn(`⚠️ Erro na tabela ${table.name}:`, result.error);
              results.push({ data: [], error: result.error });
            } else {
              console.log(`✅ ${table.name}: ${result.data?.length || 0} registros`);
              results.push({ data: result.data || [], error: null });
            }
          } catch (error) {
            console.warn(`⚠️ Falha ao carregar tabela ${table.name}:`, error);
            results.push({ data: [], error: error });
          }
        }

        // Atribui os dados ao estado (mesmo com erros, continua)
        [state.customers, state.products, state.orders, state.expenses, state.personalIncomes, state.ingredients, state.productIngredients, state.orderItems, state.motoboys, state.cashSessions, state.employees] = results.map(res => res.data || []);
        state.activeCashSession = state.cashSessions.find(s => s.data_fechamento === null);

        console.log('🎉 Dados atribuídos ao estado com sucesso!');
        console.log('📊 Resumo dos dados carregados:', {
          customers: state.customers.length,
          products: state.products.length,
          orders: state.orders.length,
          expenses: state.expenses.length,
          personalIncomes: state.personalIncomes.length,
          ingredients: state.ingredients.length,
          productIngredients: state.productIngredients.length,
          orderItems: state.orderItems.length,
          motoboys: state.motoboys.length,
          cashSessions: state.cashSessions.length,
          employees: state.employees.length
        });
      })(),
      timeoutPromise
    ]);

  } catch (error) {
    console.error('💥 Erro crítico ao carregar dados:', error);
    // Mesmo com erro, inicializa arrays vazios para não quebrar a aplicação
    state.customers = [];
    state.products = [];
    state.orders = [];
    state.expenses = [];
    state.personalIncomes = [];
    state.ingredients = [];
    state.productIngredients = [];
    state.orderItems = [];
    state.motoboys = [];
    state.cashSessions = [];
    state.employees = [];
    state.activeCashSession = null;
    console.log('🔄 Arrays inicializados com valores vazios');
  }
};

export const resetCurrentOrder = () => {
  state.editingOrderId = null;
  state.currentOrder = {
    customer_id: null,
    items: [],
    total: 0,
    payment_method: 'Dinheiro',
    status: 'Pendente',
    is_delivery: false,
    notes: '',
    delivery_cost: 0,
    step: 1,
    is_internal_consumption: false
  };
};
resetCurrentOrder();

export const handleFinalizeOrderSubmit = async (e) => {
  e.preventDefault();
  const isEditing = state.editingOrderId !== null;
  const { activeCashSession } = state;

  if (!activeCashSession && !isEditing) {
    showToast("O caixa está fechado. Abra o caixa para lançar um novo pedido.", true);
    return;
  }

  const { customer_id, items, total, payment_method, is_delivery, notes, delivery_cost, is_internal_consumption } = state.currentOrder;

  console.log('Dados do pedido para finalização:', {
    customer_id,
    customer_id_type: typeof customer_id,
    is_internal_consumption,
    items_count: items.length
  });

  // Verificar se o cliente foi selecionado corretamente
  if (!customer_id && !is_internal_consumption) {
    showToast("Selecione um cliente.", true);
    console.error('Nenhum cliente selecionado e não é consumo interno');
    return;
  }

  if (items.length === 0) {
    showToast("Adicione pelo menos um item ao pedido.", true);
    return;
  }

  showLoading();

  try {
    // Obter o ID do funcionário logado
    const currentUserEmployee = state.employees.find(emp => emp.user_id === state.currentUser.id);
    const employeeId = currentUserEmployee?.id || null;

    let orderData = {
      user_id: state.currentUser.id,
      employee_id: employeeId, // Associar o pedido ao funcionário logado
      customer_id: (is_internal_consumption || customer_id === null || customer_id === undefined) ? null : customer_id,
      total_value: is_internal_consumption ? 0 : total,
      payment_method: is_internal_consumption ? null : payment_method,
      status: is_internal_consumption ? 'Concluído' : 'Pendente',
      is_delivery: is_internal_consumption ? false : is_delivery,
      notes,
      delivery_cost: is_internal_consumption ? 0 : delivery_cost,
      is_internal_consumption: is_internal_consumption
    };

    console.log('Dados do pedido a serem salvos:', orderData);

    // Adicionar caixa_sessao_id somente se houver sessão de caixa ativa
    if (activeCashSession?.id) {
      orderData.caixa_sessao_id = activeCashSession.id;
    }

    const db = getSupabaseClient();
    if (isEditing) {
      // Para edição, manter o caixa_sessao_id do pedido original, se existir
      const existingOrder = state.orders.find(o => o.id === state.editingOrderId);
      if (existingOrder?.caixa_sessao_id) {
        orderData.caixa_sessao_id = existingOrder.caixa_sessao_id;
      }

      console.log('Atualizando pedido existente:', state.editingOrderId);
      const { error: orderError } = await db.from('orders').update(orderData).eq('id', state.editingOrderId);
      if (orderError) {
        throw new Error(`Erro ao atualizar pedido: ${orderError.message}`);
      }

      const { error: deleteError } = await db.from('order_items').delete().eq('order_id', state.editingOrderId);
      if (deleteError) {
        throw new Error(`Erro ao limpar itens antigos: ${deleteError.message}`);
      }

      if (items.length > 0) {
        const orderItemsData = items.map(item => ({
          order_id: state.editingOrderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price
        }));

        const { error: itemsError } = await db.from('order_items').insert(orderItemsData);
        if (itemsError) {
          throw new Error(`Erro ao atualizar itens: ${itemsError.message}`);
        }
      }

      showToast("Pedido atualizado com sucesso!");
    } else {
      console.log('Inserindo novo pedido');
      const { data: newOrder, error: orderError } = await db.from('orders').insert(orderData).select().single();
      if (orderError) {
        throw new Error(orderError.message);
      }

      if (items.length > 0) {
        const orderItemsData = items.map(item => ({
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price
        }));

        const { error: itemsError } = await db.from('order_items').insert(orderItemsData);
        if (itemsError) {
          throw new Error(`Erro ao salvar itens: ${itemsError.message}`);
        }
      }

      showToast(is_internal_consumption ? "Consumo interno registado!" : "Pedido lançado com sucesso!");
    }

    await loadData();
    closeAllModals();
    window.navigateTo('dashboard');
  } catch (error) {
    console.error('Erro ao finalizar pedido:', error);
    showToast(`Erro: ${error.message}`, true);
  } finally {
    hideLoading();
  }
};