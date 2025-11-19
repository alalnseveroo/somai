/**
 * SupabaseService - Camada de abstração para o Supabase
 * Centraliza todas as operações de banco de dados
 */
export class SupabaseService {
  constructor(supabaseClient) {
    if (!supabaseClient) {
      throw new Error('Supabase client é obrigatório');
    }
    this.client = supabaseClient;
  }

  /**
   * Busca dados de uma tabela
   */
  async fetchTable(tableName, options = {}) {
    console.log('Buscando dados da tabela:', tableName, 'com opções:', options);
    
    const {
      tenantId,
      select = '*',
      filters = {},
      orderBy = null,
      limit = null
    } = options;

    let query = this.client.from(tableName).select(select);
    
    // Verificar se o tenantId foi fornecido
    if (tenantId) {
      console.log('Aplicando filtro de tenantId:', tenantId);
      query = query.eq('tenant_id', tenantId);
    } else {
      console.warn('Nenhum tenantId fornecido para a tabela:', tableName);
    }

    // Apply custom filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    // Apply ordering
    if (orderBy) {
      const { column, ascending = true } = orderBy;
      query = query.order(column, { ascending });
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Insere um registro
   */
  async insert(tableName, data) {
    const { data: result, error } = await this.client
      .from(tableName)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Insere múltiplos registros
   */
  async insertMany(tableName, dataArray) {
    const { data: result, error } = await this.client
      .from(tableName)
      .insert(dataArray)
      .select();

    if (error) throw error;
    return result;
  }

  /**
   * Atualiza um registro
   */
  async update(tableName, id, data) {
    const { data: result, error } = await this.client
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Deleta um registro
   */
  async delete(tableName, id) {
    const { error } = await this.client
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  /**
   * Busca um registro por ID
   */
  async findById(tableName, id, select = '*') {
    const { data, error } = await this.client
      .from(tableName)
      .select(select)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Busca registros com query customizada
   */
  async query(tableName, queryBuilder) {
    let query = this.client.from(tableName).select('*');
    
    if (typeof queryBuilder === 'function') {
      query = queryBuilder(query);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Realiza upload de arquivo no storage
   */
  async uploadFile(bucket, path, file) {
    const { data, error } = await this.client
      .storage
      .from(bucket)
      .upload(path, file);

    if (error) throw error;
    return data;
  }

  /**
   * Obtém URL pública de um arquivo
   */
  getPublicUrl(bucket, path) {
    const { data } = this.client
      .storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Remove um arquivo do storage
   */
  async deleteFile(bucket, path) {
    const { error } = await this.client
      .storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return true;
  }

  /**
   * Executa uma RPC (Remote Procedure Call)
   */
  async rpc(functionName, params = {}) {
    const { data, error } = await this.client
      .rpc(functionName, params);

    if (error) throw error;
    return data;
  }

  /**
   * Carrega todos os dados do usuário
   */
  async loadUserData(tenantId) {
    console.log('Carregando dados do usuário para tenant:', tenantId);
    
    if (!tenantId) {
      throw new Error('Tenant ID is required to load data.');
    }

    const tables = [
      'customers',
      'products',
      'orders',
      'expenses',
      'personal_incomes',
      'ingredients',
      'product_ingredients',
      'order_items',
      'motoboys',
      'caixa_sessoes',
      'employees'
    ];

    const results = {};

    for (const table of tables) {
      try {
        let select = '*';
        
        // Custom queries for specific tables
        if (table === 'orders') {
          select = '*, customers(*), employees(name)';
        } else if (table === 'product_ingredients') {
          select = '*, ingredients(name, unit)';
        } else if (table === 'order_items') {
          select = '*, products(id, name, category)';
        }

        results[table] = await this.fetchTable(table, {
          tenantId,
          select,
          orderBy: this._getDefaultOrder(table)
        });
      } catch (error) {
        console.warn(`Error loading ${table}:`, error);
        results[table] = [];
      }
    }

    return results;
  }

  _getDefaultOrder(tableName) {
    const orderMap = {
      customers: { column: 'name', ascending: true },
      products: { column: 'name', ascending: true },
      orders: { column: 'created_at', ascending: false },
      expenses: { column: 'date', ascending: false },
      personal_incomes: { column: 'date', ascending: false },
      ingredients: { column: 'name', ascending: true },
      motoboys: { column: 'name', ascending: true },
      caixa_sessoes: { column: 'data_abertura', ascending: false },
      employees: { column: 'name', ascending: true }
    };

    return orderMap[tableName] || null;
  }
}
