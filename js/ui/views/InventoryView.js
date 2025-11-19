/**
 * InventoryView - View para gestão de estoque e ingredientes
 */
import { eventBus } from '../../core/EventBus.js';
import { formatCurrency } from '../../utils/helpers.js';
import { modal } from '../components/Modal.js';
import { maskCurrency, getNumericValue } from '../../utils/helpers.js';

export class InventoryView {
  constructor(state, services) {
    this.state = state;
    this.services = services;
  }

  /**
   * Renderiza a página de inventário
   */
  render() {
    const page = document.getElementById('page-inventory');
    if (!page) return;

    const ingredients = this.state.get('ingredients') || [];
    const products = (this.state.get('products') || []).filter(p => p.is_product === true);

    page.innerHTML = `
      <div class="space-y-6">
        ${this._renderHeader(ingredients, products)}
        ${this._renderStockAlerts(ingredients)}
        ${this._renderProductsStockGrid(products)}
        ${this._renderIngredientsGrid(ingredients)}
      </div>
    `;

    this._attachEventListeners();
  }

  /**
   * Renderiza cabeçalho
   */
  _renderHeader(ingredients, products) {
    const totalValue = ingredients.reduce((sum, i) => 
      sum + (i.quantity * i.cost_per_unit || 0), 0
    );

    const lowStockCount = this.services.inventory.getStockAlerts(10).length;
    const totalProducts = products.length;

    return `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Gestão de Estoque</h2>
            <p class="text-sm text-slate-600 mt-1">
              ${ingredients.length} ingredientes e ${totalProducts} produtos cadastrados
            </p>
          </div>
          <button id="add-ingredient-btn" 
                  class="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg 
                         hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm">
            <i data-lucide="plus" class="w-4 h-4"></i>
            Novo Ingrediente
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <h3 class="text-xs font-medium text-blue-800">Total de Ingredientes</h3>
            <p class="text-2xl font-bold text-blue-900 mt-1">${ingredients.length}</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
            <h3 class="text-xs font-medium text-green-800">Valor em Estoque</h3>
            <p class="text-2xl font-bold text-green-900 mt-1">${formatCurrency(totalValue)}</p>
          </div>
          <div class="bg-${lowStockCount > 0 ? 'red' : 'slate'}-50 p-4 rounded-lg border-l-4 border-${lowStockCount > 0 ? 'red' : 'slate'}-500">
            <h3 class="text-xs font-medium text-${lowStockCount > 0 ? 'red' : 'slate'}-800">Alertas de Estoque Baixo</h3>
            <p class="text-2xl font-bold text-${lowStockCount > 0 ? 'red' : 'slate'}-900 mt-1">${lowStockCount}</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza alertas de estoque
   */
  _renderStockAlerts(ingredients) {
    const alerts = this.services.inventory.getStockAlerts(10);

    if (alerts.length === 0) return '';

    return `
      <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
        <div class="flex items-start gap-3">
          <i data-lucide="alert-triangle" class="w-5 h-5 text-red-600 mt-0.5"></i>
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-red-800">Atenção: Estoque Baixo!</h3>
            <p class="text-xs text-red-700 mt-1">
              Os seguintes ingredientes estão com estoque baixo:
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              ${alerts.map(ing => `
                <span class="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                  ${ing.name}: ${ing.quantity} ${ing.unit}
                </span>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza grid de ingredientes
   */
  _renderIngredientsGrid(ingredients) {
    if (ingredients.length === 0) {
      return `
        <div class="bg-white p-8 rounded-xl shadow-sm text-center">
          <i data-lucide="package" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
          <p class="text-slate-500">Nenhum ingrediente cadastrado</p>
        </div>
      `;
    }

    return `
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr class="text-xs text-slate-600">
                <th class="px-3 py-2 font-semibold">Ingrediente</th>
                <th class="px-3 py-2 font-semibold text-right">Quantidade</th>
                <th class="px-3 py-2 font-semibold">Unidade</th>
                <th class="px-3 py-2 font-semibold text-right">Custo/Unidade</th>
                <th class="px-3 py-2 font-semibold text-right">Valor Total</th>
                <th class="px-3 py-2 font-semibold text-center">Status</th>
                <th class="px-3 py-2 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${ingredients.map(ing => this._renderIngredientRow(ing)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza linha de ingrediente
   */
  _renderIngredientRow(ingredient) {
    const totalValue = (ingredient.quantity || 0) * (ingredient.cost_per_unit || 0);
    const isLowStock = ingredient.quantity <= (ingredient.min_quantity || 10);
    const productIngredients = this.services.inventory.getProductIngredients(ingredient.id);

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-3 py-2">
          <div>
            <p class="font-medium text-slate-900 text-sm">${ingredient.name || 'Sem nome'}</p>
            ${productIngredients.length > 0 ? `
              <p class="text-xs text-slate-500 mt-1">
                Usado em ${productIngredients.length} produto${productIngredients.length > 1 ? 's' : ''}
              </p>
            ` : ''}
          </div>
        </td>
        <td class="px-3 py-2 text-right">
          <span class="font-semibold text-slate-900 text-sm">
            ${ingredient.quantity || 0}
          </span>
        </td>
        <td class="px-3 py-2">
          <span class="text-slate-700 text-sm">${ingredient.unit || 'un'}</span>
        </td>
        <td class="px-3 py-2 text-right">
          <span class="text-slate-700 text-sm">${formatCurrency(ingredient.cost_per_unit || 0)}</span>
        </td>
        <td class="px-3 py-2 text-right">
          <span class="font-semibold text-green-600 text-sm">${formatCurrency(totalValue)}</span>
        </td>
        <td class="px-3 py-2 text-center">
          ${isLowStock ? `
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              <i data-lucide="alert-circle" class="w-3 h-3"></i>
              Baixo
            </span>
          ` : `
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              <i data-lucide="check-circle" class="w-3 h-3"></i>
              OK
            </span>
          `}
        </td>
        <td class="px-3 py-2">
          <div class="flex gap-1 justify-center">
            <button data-ingredient-id="${ingredient.id}" 
                    class="edit-ingredient-btn text-blue-600 hover:text-blue-700 p-1"
                    title="Editar">
              <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <button data-ingredient-id="${ingredient.id}" 
                    class="delete-ingredient-btn text-red-600 hover:text-red-700 p-1"
                    title="Deletar">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Renderiza grid de produtos
   */
  _renderProductsStockGrid(products) {
    if (products.length === 0) return '';

    return `
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr class="text-xs text-slate-600">
                <th class="px-3 py-2 font-semibold">Produto</th>
                <th class="px-3 py-2 font-semibold text-right">Estoque</th>
                <th class="px-3 py-2 font-semibold">Unidade</th>
                <th class="px-3 py-2 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${products.map(p => this._renderProductRow(p)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza linha de produto
   */
  _renderProductRow(product) {
    const isLowStock = product.stock_quantity <= (product.min_stock_quantity || 10);

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-3 py-2">
          <div>
            <p class="font-medium text-slate-900 text-sm">${product.name || 'Sem nome'}</p>
          </div>
        </td>
        <td class="px-3 py-2 text-right">
          <span class="font-semibold text-slate-900 text-sm">
            ${product.stock_quantity || 0}
          </span>
        </td>
        <td class="px-3 py-2">
          <span class="text-slate-700 text-sm">${product.unit || 'un'}</span>
        </td>
        <td class="px-3 py-2 text-center">
          ${isLowStock ? `
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              <i data-lucide="alert-circle" class="w-3 h-3"></i>
              Baixo
            </span>
          ` : `
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              <i data-lucide="check-circle" class="w-3 h-3"></i>
              OK
            </span>
          `}
        </td>
      </tr>
    `;
  }

  /**
   * Anexa event listeners
   */
  _attachEventListeners() {
    // Adicionar ingrediente
    document.getElementById('add-ingredient-btn')?.addEventListener('click', () => {
      this._showIngredientForm();
    });

    // Editar ingrediente
    document.querySelectorAll('.edit-ingredient-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ingredientId = e.currentTarget.dataset.ingredientId;
        const ingredient = this.state.get('ingredients')?.find(i => i.id === ingredientId);
        this._showIngredientForm(ingredient);
      });
    });

    // Deletar ingrediente
    document.querySelectorAll('.delete-ingredient-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const ingredientId = e.currentTarget.dataset.ingredientId;
        const ingredient = this.state.get('ingredients')?.find(i => i.id === ingredientId);
        
        if (confirm(`Tem certeza que deseja deletar o ingrediente ${ingredient?.name}?`)) {
          try {
            await this.services.inventory.delete(ingredientId);
            eventBus.emit('toast:show', { 
              message: 'Ingrediente deletado com sucesso!', 
              isError: false 
            });
            this.render();
          } catch (error) {
            eventBus.emit('toast:show', { 
              message: error.message || 'Erro ao deletar ingrediente', 
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
   * Exibe formulário de ingrediente (criar/editar)
   */
  _showIngredientForm(ingredient = null) {
    const isEdit = !!ingredient;
    
    const content = `
      <form id="ingredient-form" class="space-y-4">
        <div>
          <label for="ingredient-name" class="block text-sm font-medium text-slate-700 mb-2">
            Nome do Ingrediente *
          </label>
          <input type="text" 
                 id="ingredient-name" 
                 required 
                 value="${ingredient?.name || ''}"
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="Ex: Farinha de Trigo">
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label for="ingredient-quantity" class="block text-sm font-medium text-slate-700 mb-2">
              Quantidade *
            </label>
            <input type="number" 
                   id="ingredient-quantity" 
                   required 
                   min="0"
                   step="0.01"
                   value="${ingredient?.quantity || ''}"
                   class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="0">
          </div>
          
          <div>
            <label for="ingredient-unit" class="block text-sm font-medium text-slate-700 mb-2">
              Unidade *
            </label>
            <select id="ingredient-unit" 
                    required
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="">Selecione...</option>
              <option value="kg" ${ingredient?.unit === 'kg' ? 'selected' : ''}>kg</option>
              <option value="g" ${ingredient?.unit === 'g' ? 'selected' : ''}>g</option>
              <option value="l" ${ingredient?.unit === 'l' ? 'selected' : ''}>l</option>
              <option value="ml" ${ingredient?.unit === 'ml' ? 'selected' : ''}>ml</option>
              <option value="un" ${ingredient?.unit === 'un' ? 'selected' : ''}>un</option>
              <option value="cx" ${ingredient?.unit === 'cx' ? 'selected' : ''}>cx</option>
            </select>
          </div>
          
          <div>
            <label for="ingredient-min-quantity" class="block text-sm font-medium text-slate-700 mb-2">
              Estoque Mínimo
            </label>
            <input type="number" 
                   id="ingredient-min-quantity" 
                   min="0"
                   step="0.01"
                   value="${ingredient?.min_quantity || ''}"
                   class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="0">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="ingredient-cost" class="block text-sm font-medium text-slate-700 mb-2">
              Custo por Unidade
            </label>
            <input type="text" 
                   id="ingredient-cost" 
                   value="${ingredient?.cost_per_unit ? formatCurrency(ingredient.cost_per_unit) : ''}"
                   class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="R$ 0,00">
          </div>
        </div>
        
        <div class="flex gap-3 pt-4">
          <button type="button" 
                  id="cancel-ingredient-btn"
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

    modal.open(isEdit ? 'Editar Ingrediente' : 'Novo Ingrediente', content, { size: 'medium' });

    // Event listeners
    const form = document.getElementById('ingredient-form');
    const costInput = document.getElementById('ingredient-cost');
    const cancelBtn = document.getElementById('cancel-ingredient-btn');

    costInput?.addEventListener('input', maskCurrency);
    cancelBtn?.addEventListener('click', () => modal.close());

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleIngredientSubmit(ingredient?.id);
    });
  }

  /**
   * Processa envio do formulário de ingrediente
   */
  async _handleIngredientSubmit(ingredientId = null) {
    try {
      const name = document.getElementById('ingredient-name').value.trim();
      const quantity = parseFloat(document.getElementById('ingredient-quantity').value) || 0;
      const unit = document.getElementById('ingredient-unit').value;
      const minQuantity = parseFloat(document.getElementById('ingredient-min-quantity').value) || 0;
      const costInput = document.getElementById('ingredient-cost').value;

      if (!name || !unit) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, preencha todos os campos obrigatórios', 
          isError: true 
        });
        return;
      }

      const costPerUnit = getNumericValue(costInput);

      const ingredientData = { 
        name, 
        quantity, 
        unit, 
        min_quantity: minQuantity,
        cost_per_unit: isNaN(costPerUnit) ? 0 : costPerUnit
      };

      if (ingredientId) {
        await this.services.inventory.update(ingredientId, ingredientData);
        eventBus.emit('toast:show', { 
          message: 'Ingrediente atualizado com sucesso!', 
          isError: false 
        });
      } else {
        await this.services.inventory.create(ingredientData);
        eventBus.emit('toast:show', { 
          message: 'Ingrediente cadastrado com sucesso!', 
          isError: false 
        });
      }

      modal.close();
      this.render();
    } catch (error) {
      console.error('Erro ao salvar ingrediente:', error);
      eventBus.emit('toast:show', { 
        message: 'Erro ao salvar ingrediente: ' + error.message, 
        isError: true 
      });
    }
  }
}
