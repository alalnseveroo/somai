/**
 * ProductsView - View para gestão de produtos/serviços
 */
import { eventBus } from '../../core/EventBus.js';
import { formatCurrency } from '../../utils/helpers.js';
import { modal } from '../components/Modal.js';
import { maskCurrency, getNumericValue } from '../../utils/helpers.js';

export class ProductsView {
  constructor(state, services) {
    this.state = state;
    this.services = services;
  }

  /**
   * Renderiza a página de produtos
   */
  render() {
    const page = document.getElementById('page-products');
    if (!page) return;

    const products = this.state.get('products') || [];

    page.innerHTML = `
      <div class="space-y-6">
        ${this._renderHeader(products)}
        ${this._renderFilters()}
        ${this._renderProductsGrid(products)}
      </div>
    `;

    this._attachEventListeners();
  }

  /**
   * Renderiza cabeçalho
   */
  _renderHeader(products) {
    const canManageProducts = this.services.auth.can('manage:products');
    const categories = [...new Set(products.map(p => p.category))];
    
    return `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Produtos e Serviços</h2>
            <p class="text-sm text-slate-600 mt-1">
              Total de ${products.length} produtos em ${categories.length} categorias
            </p>
          </div>
          ${canManageProducts ? `
          <button id="add-product-btn" 
                  class="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg 
                         hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm">
            <i data-lucide="plus" class="w-4 h-4"></i>
            Novo Produto
          </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Renderiza filtros
   */
  _renderFilters() {
    const products = this.state.get('products') || [];
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);

    return `
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-sm font-medium text-slate-700">Filtrar:</span>
          <button data-filter="all" class="filter-btn active px-4 py-2 rounded-lg text-sm font-medium 
                                          bg-indigo-600 text-white">
            Todos
          </button>
          ${categories.map(cat => `
            <button data-filter="${cat}" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium 
                                                bg-slate-100 text-slate-700 hover:bg-slate-200">
              ${cat}
            </button>
          `).join('')}
        </div>
        
        <div class="mt-3">
          <input type="text" 
                 id="product-search" 
                 placeholder="Buscar produto por nome..."
                 class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
          <i data-lucide="search" class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza grid de produtos
   */
  _renderProductsGrid(products) {
    const searchTerm = this.state.get('productSearchTerm') || '';
    const categoryFilter = this.state.get('productCategoryFilter') || 'all';
    
    let filteredProducts = products;
    
    // Filtrar por categoria
    if (categoryFilter !== 'all') {
      filteredProducts = filteredProducts.filter(p => p.category === categoryFilter);
    }
    
    // Filtrar por busca
    if (searchTerm) {
      filteredProducts = filteredProducts.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filteredProducts.length === 0) {
      return `
        <div class="bg-white p-8 rounded-xl shadow-sm text-center">
          <i data-lucide="package" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
          <p class="text-slate-500">
            ${searchTerm || categoryFilter !== 'all' ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
          </p>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        ${filteredProducts.map(product => this._renderProductCard(product)).join('')}
      </div>
    `;
  }

  /**
   * Renderiza card de produto
   */
  _renderProductCard(product) {
    const canManageProducts = this.services.auth.can('manage:products');
    const hasImage = product.image_url;
    const ingredients = this.services.inventory.getProductIngredients(product.id);
    const ingredientCost = this.services.inventory.calculateProductIngredientCost(product.id);
    const profitMargin = product.price ? ((product.price - ingredientCost) / product.price * 100).toFixed(0) : 0;

    return `
      <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden">
        ${hasImage ? `
          <div class="h-40 bg-slate-100 relative overflow-hidden">
            <img src="${product.image_url}" 
                 alt="${product.name}" 
                 class="w-full h-full object-cover"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f1f5f9%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2216%22 fill=%22%2394a3b8%22%3ESem imagem%3C/text%3E%3C/svg%3E'">
          </div>
        ` : `
          <div class="h-40 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <i data-lucide="package" class="w-16 h-16 text-indigo-300"></i>
          </div>
        `}
        
        <div class="p-4">
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <h3 class="font-bold text-slate-900 text-sm">${product.name || 'Sem nome'}</h3>
              ${product.category ? `
                <span class="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                  ${product.category}
                </span>
              ` : ''}
            </div>
            
            ${canManageProducts ? `
            <div class="flex gap-1">
              <button data-product-id="${product.id}" 
                      class="edit-product-btn text-blue-600 hover:text-blue-700 p-1">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
              </button>
              <button data-product-id="${product.id}" 
                      class="delete-product-btn text-red-600 hover:text-red-700 p-1">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
            ` : ''}
          </div>

          ${product.description ? `
            <p class="text-xs text-slate-600 mb-3 line-clamp-2">${product.description}</p>
          ` : ''}

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-500">Preço:</span>
              <span class="text-lg font-bold text-green-600">${formatCurrency(product.price)}</span>
            </div>
            ${!product.is_product && Number(product.commission || 0) > 0 ? `
              <div class="flex justify-between items-center">
                <span class="text-xs text-slate-500">Comissão do barbeiro:</span>
                <span class="text-sm font-semibold text-indigo-600">${formatCurrency(product.commission)}</span>
              </div>
            ` : ''}
            
            ${ingredients.length > 0 ? `
              <div class="flex justify-between items-center">
                <span class="text-xs text-slate-500">Custo Ingredientes:</span>
                <span class="text-sm font-semibold text-red-600">${formatCurrency(ingredientCost)}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-slate-500">Margem:</span>
                <span class="text-sm font-semibold ${profitMargin > 50 ? 'text-green-600' : profitMargin > 30 ? 'text-yellow-600' : 'text-red-600'}">
                  ${profitMargin}%
                </span>
              </div>
            ` : ''}
          </div>

          ${ingredients.length > 0 ? `
            <div class="mt-3 pt-3 border-t border-slate-200">
              <p class="text-xs text-slate-500 mb-1">Ingredientes (${ingredients.length}):</p>
              <div class="flex flex-wrap gap-1">
                ${ingredients.slice(0, 3).map(pi => `
                  <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded">
                    ${pi.ingredients?.name || 'N/A'}
                  </span>
                `).join('')}
                ${ingredients.length > 3 ? `
                  <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                    +${ingredients.length - 3}
                  </span>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Anexa event listeners
   */
  _attachEventListeners() {
    // Busca
    document.getElementById('product-search')?.addEventListener('input', (e) => {
      this.state.set('productSearchTerm', e.target.value);
      this.render();
    });

    // Filtros de categoria
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.state.set('productCategoryFilter', filter);
        
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('active', 'bg-indigo-600', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        
        e.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
        e.currentTarget.classList.remove('bg-slate-100', 'text-slate-700');
        
        this.render();
      });
    });

    document.getElementById('add-product-btn')?.addEventListener('click', () => {
      this._showProductTypeModal();
    });

    // Editar produto
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = e.currentTarget.dataset.productId;
        const product = this.state.get('products')?.find(p => p.id === productId);
        this._showProductForm(product, product?.is_product === true);
      });
    });

    // Deletar produto
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productId = e.currentTarget.dataset.productId;
        const product = this.state.get('products')?.find(p => p.id === productId);
        
        if (confirm(`Tem certeza que deseja deletar o produto ${product?.name}?`)) {
          try {
            await this.services.product.deactivate(productId);
            eventBus.emit('toast:show', { 
              message: 'Produto deletado com sucesso!', 
              isError: false 
            });
            this.render();
          } catch (error) {
            eventBus.emit('toast:show', { 
              message: 'Erro ao deletar produto', 
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

  _showProductTypeModal() {
    const content = `
      <div class="space-y-6">
        <p class="text-sm text-slate-600">Escolha o que deseja cadastrar:</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label class="block cursor-pointer">
            <input type="checkbox" id="select-service" class="hidden">
            <div class="type-card type-service-card p-4 border border-slate-300 rounded-lg hover:border-indigo-500 transition-colors">
              <div class="flex items-center gap-3">
                <i data-lucide="scissors" class="w-6 h-6 text-indigo-600"></i>
                <h3 class="font-semibold text-slate-900 text-sm">Serviço</h3>
              </div>
              <p class="text-xs text-slate-600 mt-2">Registre um serviço de barbearia. Defina o preço e a Comissão do Barbeiro, que será calculada automaticamente no caixa.</p>
            </div>
          </label>
          <label class="block cursor-pointer">
            <input type="checkbox" id="select-product" class="hidden">
            <div class="type-card type-product-card p-4 border border-slate-300 rounded-lg hover:border-indigo-500 transition-colors">
              <div class="flex items-center gap-3">
                <i data-lucide="package" class="w-6 h-6 text-indigo-600"></i>
                <h3 class="font-semibold text-slate-900 text-sm">Produto</h3>
              </div>
              <p class="text-xs text-slate-600 mt-2">Cadastre itens para venda ou uso. Cada venda ou consumo fará uma baixa automática no estoque para controle de inventário.</p>
            </div>
          </label>
        </div>

        <div class="flex gap-3 pt-2">
          <button type="button" id="cancel-type-btn" class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-300 transition-colors text-sm">Cancelar</button>
          <button type="button" id="continue-type-btn" class="flex-1 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled>Continuar</button>
        </div>
      </div>
    `;

    modal.open('Novo Cadastro', content, { size: 'medium' });

    const serviceCheckbox = document.getElementById('select-service');
    const productCheckbox = document.getElementById('select-product');
    const continueBtn = document.getElementById('continue-type-btn');
    const cancelBtn = document.getElementById('cancel-type-btn');

    const updateSelection = () => {
      const anySelected = serviceCheckbox.checked || productCheckbox.checked;
      continueBtn.disabled = !anySelected;
    };

    serviceCheckbox?.addEventListener('change', () => {
      if (serviceCheckbox.checked) productCheckbox.checked = false;
      updateSelection();
    });
    productCheckbox?.addEventListener('change', () => {
      if (productCheckbox.checked) serviceCheckbox.checked = false;
      updateSelection();
    });

    cancelBtn?.addEventListener('click', () => {
      modal.close();
    });

    continueBtn?.addEventListener('click', () => {
      const isProduct = productCheckbox.checked;
      modal.close();
      this._showProductForm(null, isProduct);
    });
  }

  /**
   * Exibe formulário de produto (criar/editar)
   */
  _showProductForm(product = null, isProductSelected = null) {
    const isEdit = !!product;
    const isProduct = isProductSelected === null ? (product?.is_product === true) : isProductSelected;

    const content = `
      <form id="product-form" class="space-y-4">
        <input type="hidden" id="product-type" value="${isProduct ? 'product' : 'service'}">
        <div>
          <label for="product-name" class="block text-sm font-medium text-slate-700 mb-2">
            Nome do ${isProduct ? 'Produto' : 'Serviço'} *
          </label>
          <input type="text" 
                 id="product-name" 
                 required 
                 value="${product?.name || ''}"
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="Ex: Corte de Cabelo">
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="product-category" class="block text-sm font-medium text-slate-700 mb-2">
              Categoria *
            </label>
            <select id="product-category" 
                    required
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="">Selecione...</option>
              <option value="principal" ${product?.category === 'principal' ? 'selected' : ''}>Principal</option>
              <option value="bebida" ${product?.category === 'bebida' ? 'selected' : ''}>Bebida</option>
              <option value="adicional" ${product?.category === 'adicional' ? 'selected' : ''}>Adicional</option>
              <option value="sobremesa" ${product?.category === 'sobremesa' ? 'selected' : ''}>Sobremesa</option>
            </select>
          </div>
          <div>
            <label for="product-price" class="block text-sm font-medium text-slate-700 mb-2">
              Preço *
            </label>
            <input type="text" 
                   id="product-price" 
                   required 
                   value="${product?.price ? formatCurrency(product.price) : ''}"
                   class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="R$ 0,00">
          </div>
        </div>

        ${!isProduct ? `
        <div>
          <label for="product-commission" class="block text-sm font-medium text-slate-700 mb-2">
            Comissão do barbeiro
          </label>
          <input type="text" 
                 id="product-commission" 
                 value="${product?.commission ? formatCurrency(product.commission) : ''}"
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="R$ 0,00">
        </div>
        ` : ''}

        <div>
          <label for="product-description" class="block text-sm font-medium text-slate-700 mb-2">
            Descrição
          </label>
          <textarea id="product-description" 
                    rows="3"
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Descrição do ${isProduct ? 'produto' : 'serviço'}">${product?.description || ''}</textarea>
        </div>

        <div id="product-stock-fields" class="space-y-4 pt-2 border-t border-slate-200 ${isProduct ? '' : 'hidden'}">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="product-stock-quantity" class="block text-sm font-medium text-slate-700 mb-2">Qtd. Atual</label>
              <input type="number" 
                     id="product-stock-quantity" 
                     step="0.01" 
                     value="${product?.stock_quantity || ''}"
                     class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                     placeholder="0">
            </div>
            <div>
              <label for="product-min-stock" class="block text-sm font-medium text-slate-700 mb-2">Qtd. Mínima</label>
              <input type="number" 
                     id="product-min-stock" 
                     step="0.01" 
                     value="${product?.min_stock_quantity || ''}"
                     class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                     placeholder="0">
            </div>
          </div>
          <div>
            <label for="product-unit" class="block text-sm font-medium text-slate-700 mb-2">Unidade</label>
            <select id="product-unit" 
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="unidade" ${product?.unit === 'unidade' ? 'selected' : ''}>Unidade</option>
              <option value="kg" ${product?.unit === 'kg' ? 'selected' : ''}>Kg</option>
              <option value="g" ${product?.unit === 'g' ? 'selected' : ''}>Gramas</option>
              <option value="L" ${product?.unit === 'L' ? 'selected' : ''}>Litros</option>
              <option value="ml" ${product?.unit === 'ml' ? 'selected' : ''}>Mililitros</option>
            </select>
          </div>
        </div>

        <div class="flex gap-3 pt-4">
          <button type="button" 
                  id="cancel-product-btn"
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

    const title = isEdit ? `Editar ${isProduct ? 'Produto' : 'Serviço'}` : `Novo ${isProduct ? 'Produto' : 'Serviço'}`;
    modal.open(title, content, { size: 'medium' });

    const form = document.getElementById('product-form');
    const priceInput = document.getElementById('product-price');
    const commissionInput = document.getElementById('product-commission');
    const cancelBtn = document.getElementById('cancel-product-btn');
    const stockFields = document.getElementById('product-stock-fields');
    const typeInput = document.getElementById('product-type');

    if (typeInput?.value === 'product') {
      stockFields?.classList.remove('hidden');
    } else {
      stockFields?.classList.add('hidden');
    }

    priceInput?.addEventListener('input', maskCurrency);
    commissionInput?.addEventListener('input', maskCurrency);
    cancelBtn?.addEventListener('click', () => modal.close());

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const selectedType = typeInput?.value === 'product';
      await this._handleProductSubmit(product?.id, selectedType);
    });
  }

  /**
   * Processa envio do formulário de produto
   */
  async _handleProductSubmit(productId = null, isProductArg = null) {
    try {
      const name = document.getElementById('product-name').value.trim();
      const category = document.getElementById('product-category').value;
      const priceInput = document.getElementById('product-price').value;
      const description = document.getElementById('product-description').value.trim();
      const typeValue = document.getElementById('product-type')?.value;
      const isProduct = isProductArg !== null ? isProductArg : (typeValue === 'product');

      if (!name || !category) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, preencha todos os campos obrigatórios', 
          isError: true 
        });
        return;
      }

      const price = getNumericValue(priceInput);
      const commission = isProduct ? 0 : getNumericValue(document.getElementById('product-commission')?.value || '');
      if (isNaN(price) || price <= 0) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, insira um preço válido', 
          isError: true 
        });
        return;
      }

      // Preparar dados do produto
      const productData = { name, category, price, commission, description, is_product: isProduct };

      // Se for produto, adicionar campos de estoque
      if (isProduct) {
        const stockQuantity = parseFloat(document.getElementById('product-stock-quantity').value) || 0;
        const minStockQuantity = parseFloat(document.getElementById('product-min-stock').value) || 0;
        const unit = document.getElementById('product-unit').value || 'unidade';
        
        productData.stock_quantity = stockQuantity;
        productData.min_stock_quantity = minStockQuantity;
        productData.unit = unit;
      }

      if (productId) {
        await this.services.product.update(productId, productData);
        eventBus.emit('toast:show', { 
          message: `${isProduct ? 'Produto' : 'Serviço'} atualizado com sucesso!`, 
          isError: false 
        });
      } else {
        await this.services.product.create(productData);
        eventBus.emit('toast:show', { 
          message: `${isProduct ? 'Produto' : 'Serviço'} cadastrado com sucesso!`, 
          isError: false 
        });
      }

      modal.close();
      this.render();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      eventBus.emit('toast:show', { 
        message: 'Erro ao salvar produto: ' + error.message, 
        isError: true 
      });
    }
  }
}
