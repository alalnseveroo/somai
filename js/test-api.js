// Script de teste interno para verificar a API e requisições
// Este script pode ser temporariamente adicionado ao seu app.js para testar a funcionalidade

export class ApiTestService {
    constructor(supabaseClient) {
        this.db = supabaseClient;
    }

    // Teste completo de criação e recuperação de pedidos
    async runFullTest(userId) {
        console.log('🔍 Iniciando teste de API completo...');
        
        try {
            // Teste 1: Verificar se podemos recuperar dados existentes
            console.log('✅ Teste 1: Recuperando dados existentes...');
            await this.testDataRetrieval(userId);
            
            // Teste 2: Criar um pedido de teste
            console.log('✅ Teste 2: Criando pedido de teste...');
            const orderId = await this.testOrderCreation(userId);
            
            // Teste 3: Verificar se o pedido foi criado corretamente
            console.log('✅ Teste 3: Verificando criação do pedido...');
            await this.verifyOrderCreation(userId, orderId);
            
            // Teste 4: Criar itens de pedido de teste
            console.log('✅ Teste 4: Criando itens de pedido...');
            const itemId = await this.testOrderItemCreation(userId, orderId);
            
            // Teste 5: Verificar se os itens foram criados corretamente
            console.log('✅ Teste 5: Verificando criação de itens de pedido...');
            await this.verifyOrderItemCreation(userId, orderId, itemId);
            
            console.log('🎉 Todos os testes passaram com sucesso!');
            return true;
        } catch (error) {
            console.error('❌ Erro nos testes:', error);
            return false;
        }
    }

    async testDataRetrieval(userId) {
        const { data: orders, error: ordersError } = await this.db
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .limit(5);

        if (ordersError) {
            throw new Error(`Erro ao recuperar pedidos: ${ordersError.message}`);
        }

        const { data: items, error: itemsError } = await this.db
            .from('order_items')
            .select('*')
            .eq('user_id', userId)
            .limit(5);

        if (itemsError) {
            throw new Error(`Erro ao recuperar itens de pedido: ${itemsError.message}`);
        }

        console.log(`   - Recuperados ${orders.length} pedidos e ${items.length} itens de pedido`);
        return { orders, items };
    }

    async testOrderCreation(userId) {
        // Primeiro precisamos ter um cliente e um produto para criar o pedido
        const { data: customers, error: customersError } = await this.db
            .from('customers')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

        if (customersError) throw customersError;
        
        let customerId = null;
        if (customers.length > 0) {
            customerId = customers[0].id;
        } else {
            // Criar um cliente de teste se não existir
            const { data: newCustomer, error: customerError } = await this.db
                .from('customers')
                .insert([{ 
                    user_id: userId, 
                    name: 'Cliente de Teste',
                    phone: '11999999999'
                }])
                .select()
                .single();
                
            if (customerError) throw customerError;
            customerId = newCustomer.id;
        }

        const { data: products, error: productsError } = await this.db
            .from('products')
            .select('id, price')
            .eq('user_id', userId)
            .limit(1);

        if (productsError) throw productsError;

        let productId = null;
        let productPrice = 10.00;
        if (products.length > 0) {
            productId = products[0].id;
            productPrice = products[0].price;
        } else {
            // Criar um produto de teste se não existir
            const { data: newProduct, error: productError } = await this.db
                .from('products')
                .insert([{ 
                    user_id: userId, 
                    name: 'Produto de Teste',
                    price: 10.00
                }])
                .select()
                .single();
                
            if (productError) throw productError;
            productId = newProduct.id;
        }

        // Criar o pedido de teste
        const orderData = {
            user_id: userId,
            customer_id: customerId,
            total_value: productPrice,
            payment_method: 'Dinheiro',
            status: 'Pendente',
            is_delivery: false
        };

        const { data: newOrder, error: orderError } = await this.db
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (orderError) {
            throw new Error(`Erro ao criar pedido: ${orderError.message}`);
        }

        console.log(`   - Pedido criado com ID: ${newOrder.id}`);
        return newOrder.id;
    }

    async verifyOrderCreation(userId, orderId) {
        const { data, error } = await this.db
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .eq('id', orderId)
            .single();

        if (error) {
            throw new Error(`Erro ao verificar pedido: ${error.message}`);
        }

        if (!data) {
            throw new Error(`Pedido com ID ${orderId} não encontrado`);
        }

        console.log(`   - Pedido verificado: ID ${data.id}, User ID: ${data.user_id}, Status: ${data.status}`);
        return data;
    }

    async testOrderItemCreation(userId, orderId) {
        // Pegar um produto para criar o item de pedido
        const { data: products, error: productsError } = await this.db
            .from('products')
            .select('id, price')
            .eq('user_id', userId)
            .limit(1);

        if (productsError) throw productsError;

        if (products.length === 0) {
            throw new Error('Nenhum produto encontrado para criar item de pedido');
        }

        const itemData = {
            user_id: userId,        // Este é o campo crucial que estávamos esquecendo!
            order_id: orderId,
            product_id: products[0].id,
            quantity: 2,
            unit_price: products[0].price
        };

        const { data: newItem, error: itemError } = await this.db
            .from('order_items')
            .insert([itemData])
            .select()
            .single();

        if (itemError) {
            throw new Error(`Erro ao criar item de pedido: ${itemError.message}`);
        }

        console.log(`   - Item de pedido criado com ID: ${newItem.id}`);
        return newItem.id;
    }

    async verifyOrderItemCreation(userId, orderId, itemId) {
        const { data, error } = await this.db
            .from('order_items')
            .select(`
                *,
                products(name)
            `)
            .eq('user_id', userId)
            .eq('id', itemId)
            .single();

        if (error) {
            throw new Error(`Erro ao verificar item de pedido: ${error.message}`);
        }

        if (!data) {
            throw new Error(`Item de pedido com ID ${itemId} não encontrado`);
        }

        console.log(`   - Item de pedido verificado: ID ${data.id}, Produto: ${data.products?.name}, Quantidade: ${data.quantity}`);
        
        // Verificar também se o item está associado ao pedido correto
        if (data.order_id !== orderId) {
            throw new Error(`Item de pedido não está associado ao pedido correto`);
        }
        
        // Verificar se o user_id está correto (este era o problema principal)
        if (data.user_id !== userId) {
            throw new Error(`user_id incorreto no item de pedido: esperado ${userId}, obtido ${data.user_id}`);
        }

        console.log(`   - Validações passaram: user_id e order_id estão corretos`);
        return data;
    }
}

// Função para rodar o teste facilmente
window.runApiTest = async function() {
    if (!window.supabase) {
        console.error('Supabase não está disponível');
        return false;
    }
    
    const user = await window.supabase.auth.getUser();
    if (!user.data?.user) {
        console.error('Nenhum usuário autenticado');
        return false;
    }
    
    console.log('👤 Usuário autenticado:', user.data.user.id);
    
    const testService = new ApiTestService(window.supabase);
    const result = await testService.runFullTest(user.data.user.id);
    
    if (result) {
        console.log('✅ Teste de API concluído com sucesso!');
    } else {
        console.error('❌ Teste de API falhou!');
    }
    
    return result;
};