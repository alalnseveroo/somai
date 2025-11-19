import { eventBus } from '../core/EventBus.js';
/**
 * InventoryService - Serviço para gestão de estoque/ingredientes
 */
export class InventoryService {
  constructor(dbService, state) {
    this.db = dbService;
    this.state = state;
  }

  /**
   * Carrega todos os ingredientes
   */
  async loadIngredients() {
    try {
      const userId = this._getUserId();
      const { data, error } = await this.db.client
        .from('ingredients')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      
      this.state.set('ingredients', data || []);
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar ingredientes:', error);
      throw error;
    }
  }

  /**
   * Carrega relações produto-ingrediente
   */
  async loadProductIngredients() {
    try {
      const userId = this._getUserId();
      const { data, error } = await this.db.client
        .from('product_ingredients')
        .select('*, ingredients(name, unit)')
        .eq('user_id', userId);

      if (error) throw error;
      
      this.state.set('productIngredients', data || []);
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar ingredientes de produtos:', error);
      throw error;
    }
  }

  /**
   * Cria um novo ingrediente
   */
  async createIngredient(ingredientData) {
    try {
      const userId = this._getUserId();
      
      const newIngredient = {
        ...ingredientData,
        user_id: userId
      };

      const { data, error } = await this.db.client
        .from('ingredients')
        .insert(newIngredient)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado
      const ingredients = this.state.get('ingredients') || [];
      this.state.set('ingredients', [...ingredients, data]);

      return data;
    } catch (error) {
      console.error('Erro ao criar ingrediente:', error);
      throw error;
    }
  }

  /**
   * Atualiza um ingrediente
   */
  async updateIngredient(ingredientId, updates) {
    try {
      const { data, error } = await this.db.client
        .from('ingredients')
        .update(updates)
        .eq('id', ingredientId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado
      const ingredients = this.state.get('ingredients') || [];
      const index = ingredients.findIndex(i => i.id === ingredientId);
      if (index !== -1) {
        ingredients[index] = data;
        this.state.set('ingredients', [...ingredients]);
      }

      // Emitir eventos para refletir atualização de estoque
      eventBus.emit('ingredient:stock-updated', data);
      const minQty = data.min_quantity || 0;
      if (typeof data.quantity === 'number' && data.quantity <= minQty) {
        eventBus.emit('ingredient:low-stock', data);
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar ingrediente:', error);
      throw error;
    }
  }

  /**
   * Deleta um ingrediente
   */
  async deleteIngredient(ingredientId) {
    try {
      // Verificar se ingrediente está em uso
      const productIngredients = this.state.get('productIngredients') || [];
      const isInUse = productIngredients.some(pi => pi.ingredient_id === ingredientId);
      
      if (isInUse) {
        throw new Error('Ingrediente está sendo usado em produtos');
      }

      const { error } = await this.db.client
        .from('ingredients')
        .delete()
        .eq('id', ingredientId);

      if (error) throw error;

      // Atualizar estado
      const ingredients = this.state.get('ingredients') || [];
      this.state.set('ingredients', ingredients.filter(i => i.id !== ingredientId));

      return true;
    } catch (error) {
      console.error('Erro ao deletar ingrediente:', error);
      throw error;
    }
  }

  /**
   * Associa ingrediente a produto
   */
  async addIngredientToProduct(productId, ingredientId, quantity) {
    try {
      const userId = this._getUserId();
      
      const newRelation = {
        user_id: userId,
        product_id: productId,
        ingredient_id: ingredientId,
        quantity: quantity
      };

      const { data, error } = await this.db.client
        .from('product_ingredients')
        .insert(newRelation)
        .select('*, ingredients(name, unit)')
        .single();

      if (error) throw error;

      // Atualizar estado
      const productIngredients = this.state.get('productIngredients') || [];
      this.state.set('productIngredients', [...productIngredients, data]);

      return data;
    } catch (error) {
      console.error('Erro ao adicionar ingrediente ao produto:', error);
      throw error;
    }
  }

  /**
   * Remove ingrediente de produto
   */
  async removeIngredientFromProduct(productIngredientId) {
    try {
      const { error } = await this.db.client
        .from('product_ingredients')
        .delete()
        .eq('id', productIngredientId);

      if (error) throw error;

      // Atualizar estado
      const productIngredients = this.state.get('productIngredients') || [];
      this.state.set('productIngredients', 
        productIngredients.filter(pi => pi.id !== productIngredientId)
      );

      return true;
    } catch (error) {
      console.error('Erro ao remover ingrediente do produto:', error);
      throw error;
    }
  }

  /**
   * Atualiza quantidade de ingrediente no produto
   */
  async updateProductIngredientQuantity(productIngredientId, newQuantity) {
    try {
      const { data, error } = await this.db.client
        .from('product_ingredients')
        .update({ quantity: newQuantity })
        .eq('id', productIngredientId)
        .select('*, ingredients(name, unit)')
        .single();

      if (error) throw error;

      // Atualizar estado
      const productIngredients = this.state.get('productIngredients') || [];
      const index = productIngredients.findIndex(pi => pi.id === productIngredientId);
      if (index !== -1) {
        productIngredients[index] = data;
        this.state.set('productIngredients', [...productIngredients]);
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar quantidade de ingrediente:', error);
      throw error;
    }
  }

  /**
   * Obtém ingredientes de um produto
   */
  getProductIngredients(productId) {
    const productIngredients = this.state.get('productIngredients') || [];
    return productIngredients.filter(pi => pi.product_id === productId);
  }

  /**
   * Calcula custo de ingredientes de um produto
   */
  calculateProductIngredientCost(productId) {
    const productIngredients = this.getProductIngredients(productId);
    const ingredients = this.state.get('ingredients') || [];
    
    let totalCost = 0;
    
    productIngredients.forEach(pi => {
      const ingredient = ingredients.find(i => i.id === pi.ingredient_id);
      if (ingredient && ingredient.cost_per_unit) {
        totalCost += ingredient.cost_per_unit * pi.quantity;
      }
    });
    
    return totalCost;
  }

  /**
   * Deduz estoque baseado em venda
   */
  async deductStockFromSale(orderItems) {
    try {
      const updates = [];
      
      for (const item of orderItems) {
        // Primeiro, verificar se o item é um produto com estoque
        const product = await this.db.findById('products', item.product_id);
        
        if (product && product.is_product) {
          // Deduzir estoque do produto diretamente
          const newQuantity = product.stock_quantity - (item.quantity || 0);
          
          if (newQuantity < 0) {
            console.warn(`Estoque insuficiente para ${product.name}`);
          }
          
          // Atualizar estoque do produto
          await this.services.product.updateStock(product.id, newQuantity, 'set');
        }
        
        // Depois, deduzir estoque dos ingredientes (se houver)
        const productIngredients = this.getProductIngredients(item.product_id);
        
        for (const pi of productIngredients) {
          const ingredient = this.state.get('ingredients')
            ?.find(i => i.id === pi.ingredient_id);
          
          if (ingredient) {
            const newQuantity = ingredient.quantity - (pi.quantity * item.quantity);
            
            if (newQuantity < 0) {
              console.warn(`Estoque insuficiente para ${ingredient.name}`);
            }
            
            updates.push({
              id: ingredient.id,
              quantity: Math.max(0, newQuantity)
            });
          }
        }
      }
      
      // Atualizar ingredientes em lote
      for (const update of updates) {
        await this.updateIngredient(update.id, { quantity: update.quantity });
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao deduzir estoque:', error);
      throw error;
    }
  }

  /**
   * Verifica alertas de estoque baixo
   */
  getStockAlerts(threshold = 10) {
    const ingredients = this.state.get('ingredients') || [];
    return ingredients.filter(i => 
      i.quantity <= threshold || i.quantity <= (i.min_quantity || 0)
    );
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
