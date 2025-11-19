// Serviço de acesso ao banco de dados
export class DatabaseService {
    constructor(supabaseClient) {
        this.db = supabaseClient;
    }

    // ===== CRUD de Clientes =====
    async getCustomers(userId) {
        const { data, error } = await this.db
            .from('customers')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async createCustomer(customerData) {
        const { data, error } = await this.db
            .from('customers')
            .insert(customerData)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async updateCustomer(id, customerData) {
        const { data, error } = await this.db
            .from('customers')
            .update(customerData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async deleteCustomer(id) {
        const { error } = await this.db
            .from('customers')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    }

    // ===== CRUD de Produtos =====
    async getProducts(userId) {
        const { data, error } = await this.db
            .from('products')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async createProduct(productData) {
        const { data, error } = await this.db
            .from('products')
            .insert(productData)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async updateProduct(id, productData) {
        const { data, error } = await this.db
            .from('products')
            .update(productData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // ===== CRUD de Pedidos =====
    async getOrders(userId) {
        const { data, error } = await this.db
            .from('orders')
            .select(`
                *,
                customers(name, phone, address),
                motoboys(name)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async getOrderItems(userId) {
        const { data, error } = await this.db
            .from('order_items')
            .select(`
                *,
                products(name, price)
            `)
            .eq('user_id', userId);
        
        if (error) throw error;
        return data || [];
    }

    async createOrder(orderData) {
        const { data, error } = await this.db
            .from('orders')
            .insert(orderData)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async updateOrder(id, orderData) {
        const { data, error } = await this.db
            .from('orders')
            .update(orderData)
            .eq('id', id);
        
        if (error) throw error;
        return data;
    }

    async createOrderItems(items) {
        const { data, error } = await this.db
            .from('order_items')
            .insert(items);
        
        if (error) throw error;
        return data;
    }

    async deleteOrderItems(orderId) {
        const { error } = await this.db
            .from('order_items')
            .delete()
            .eq('order_id', orderId);
        
        if (error) throw error;
    }

    // ===== Carregamento em lote (mais eficiente) =====
    async loadAllData(userId) {
        const [
            customers,
            products,
            orders,
            orderItems,
            expenses,
            personalIncomes,
            motoboys,
            ingredients,
            productIngredients,
            cashSessions,
            employees
        ] = await Promise.all([
            this.getCustomers(userId),
            this.getProducts(userId),
            this.getOrders(userId),
            this.getOrderItems(userId),
            this.getExpenses(userId),
            this.getPersonalIncomes(userId),
            this.getMotoboys(userId),
            this.getIngredients(userId),
            this.getProductIngredients(userId),
            this.getCashSessions(userId),
            this.getEmployees(userId)
        ]);

        return {
            customers,
            products,
            orders,
            orderItems,
            expenses,
            personalIncomes,
            motoboys,
            ingredients,
            productIngredients,
            cashSessions,
            employees
        };
    }

    // Métodos auxiliares
    async getExpenses(userId) {
        const { data, error } = await this.db
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async getPersonalIncomes(userId) {
        const { data, error } = await this.db
            .from('personal_incomes')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async getMotoboys(userId) {
        const { data, error } = await this.db
            .from('motoboys')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        return data || [];
    }

    async getIngredients(userId) {
        const { data, error } = await this.db
            .from('ingredients')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        return data || [];
    }

    async getProductIngredients(userId) {
        const { data, error } = await this.db
            .from('product_ingredients')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        return data || [];
    }

    async getCashSessions(userId) {
        const { data, error } = await this.db
            .from('caixa_sessoes')
            .select('*')
            .eq('user_id', userId)
            .order('data_abertura', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async getEmployees(userId) {
        const { data, error } = await this.db
            .from('employees')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        return data || [];
    }
}
