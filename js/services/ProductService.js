import { eventBus } from '../core/EventBus.js';

/**
 * ProductService - Serviço para gerenciamento de produtos/serviços
 */
export class ProductService {
  constructor(dbService, appState) {
    this.db = dbService;
    this.state = appState;
  }

  /**
   * Cria um novo produto
   */
  async create(productData) {
    this._validate(productData);

    const data = {
      ...productData,
      is_active: true
    };

    // Upload de imagem se fornecida
    if (productData.imageFile) {
      data.image_url = await this._uploadImage(productData.imageFile);
    }

    const product = await this.db.insert('products', data);
    eventBus.emit('product:created', product);
    return product;
  }

  /**
   * Atualiza um produto
   */
  async update(productId, productData) {
    this._validate(productData);

    // Upload de nova imagem se fornecida
    if (productData.imageFile) {
      const oldProduct = await this.db.findById('products', productId);
      if (oldProduct.image_url) {
        await this._deleteImage(oldProduct.image_url);
      }
      productData.image_url = await this._uploadImage(productData.imageFile);
    }

    const product = await this.db.update('products', productId, productData);
    eventBus.emit('product:updated', product);
    return product;
  }

  /**
   * Desativa um produto (soft delete)
   */
  async deactivate(productId) {
    const product = await this.db.update('products', productId, {
      is_active: false
    });
    eventBus.emit('product:deactivated', product);
    return product;
  }

  /**
   * Reativa um produto
   */
  async activate(productId) {
    const product = await this.db.update('products', productId, {
      is_active: true
    });
    eventBus.emit('product:activated', product);
    return product;
  }

  /**
   * Busca todos os produtos
   */
  async getAll(includeInactive = false) {
    const tenantId = this.state.get('tenantId');
    const products = await this.db.fetchTable('products', {
      tenantId,
      orderBy: { column: 'name', ascending: true }
    });

    if (includeInactive) {
      return products;
    }

    return products.filter(p => p.is_active !== false);
  }

  /**
   * Busca produtos ativos
   */
  async getActive() {
    return this.getAll(false);
  }

  /**
   * Busca produtos por categoria
   */
  async getByCategory(category) {
    const products = await this.getAll();
    return products.filter(p => p.category === category);
  }

  /**
   * Busca produto por ID
   */
  async getById(productId) {
    return this.db.findById('products', productId);
  }

  /**
   * Busca produtos com estoque baixo
   */
  async getLowStock() {
    const products = await this.getAll();
    return products.filter(p => 
      p.is_product && 
      p.stock_quantity <= p.min_stock_quantity
    );
  }

  /**
   * Atualiza estoque de um produto
   */
  async updateStock(productId, quantity, operation = 'set') {
    const product = await this.db.findById('products', productId);

    if (!product.is_product) {
      throw new Error('Este item não é um produto com estoque');
    }

    let newQuantity;
    switch (operation) {
      case 'add':
        newQuantity = product.stock_quantity + quantity;
        break;
      case 'subtract':
        newQuantity = product.stock_quantity - quantity;
        break;
      case 'set':
      default:
        newQuantity = quantity;
    }

    if (newQuantity < 0) {
      throw new Error('Estoque não pode ser negativo');
    }

    const updated = await this.db.update('products', productId, {
      stock_quantity: newQuantity
    });

    eventBus.emit('product:stock-updated', updated);

    // Notificar se estoque baixo
    if (newQuantity <= product.min_stock_quantity) {
      eventBus.emit('product:low-stock', updated);
    }

    return updated;
  }

  /**
   * Calcula preço com comissão
   */
  calculatePriceWithCommission(product, quantity = 1) {
    const basePrice = product.price * quantity;
    const commission = product.commission_percentage || 0;
    const commissionAmount = basePrice * (commission / 100);

    return {
      basePrice,
      commission: commissionAmount,
      total: basePrice
    };
  }

  /**
   * Valida dados do produto
   */
  _validate(productData) {
    const errors = [];

    if (!productData.name || productData.name.trim() === '') {
      errors.push('Nome é obrigatório');
    }

    if (!productData.price || productData.price <= 0) {
      errors.push('Preço deve ser maior que zero');
    }

    if (!productData.category) {
      errors.push('Categoria é obrigatória');
    }

    // Validações para produtos com estoque
    if (productData.is_product) {
      if (productData.stock_quantity === undefined) {
        errors.push('Quantidade em estoque é obrigatória para produtos');
      }

      if (productData.min_stock_quantity === undefined) {
        errors.push('Estoque mínimo é obrigatório para produtos');
      }

      if (!productData.unit) {
        errors.push('Unidade é obrigatória para produtos');
      }
    }

    if (productData.commission !== undefined && productData.commission < 0) {
      errors.push('Comissão deve ser maior ou igual a zero');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  /**
   * Upload de imagem
   */
  async _uploadImage(file) {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `products/${fileName}`;

    await this.db.uploadFile('icones', filePath, file);
    return this.db.getPublicUrl('icones', filePath);
  }

  /**
   * Deleta imagem
   */
  async _deleteImage(imageUrl) {
    if (!imageUrl) return;

    try {
      // Extrair path da URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `products/${fileName}`;

      await this.db.deleteFile('icones', filePath);
    } catch (error) {
      console.warn('Erro ao deletar imagem:', error);
    }
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
