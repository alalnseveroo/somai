// Serviço de Pedidos - Lógica de negócio completa
export class OrderService {
    constructor(dbService, store) {
        this.db = dbService;
        this.store = store;
    }

    /**
     * Cria um novo pedido
     */
    async createOrder(orderData) {
        this.validateOrderData(orderData);
        
        const userId = this.store.getState().currentUser?.id;
        if (!userId) {
            throw new Error('Usuário não autenticado');
        }

        const total = this.calculateOrderTotal(orderData);
        
        const orderToSave = {
            user_id: userId,
            customer_id: orderData.customer_id,
            total_value: total,
            payment_method: orderData.payment_method || 'Dinheiro',
            status: orderData.status || 'Pendente',
            is_delivery: orderData.is_delivery || false,
            delivery_cost: orderData.delivery_cost || 0,
            notes: orderData.notes || '',
            is_internal_consumption: orderData.is_internal_consumption || false,
            motoboy_id: orderData.motoboy_id || null,
            created_at: new Date().toISOString()
        };

        const order = await this.db.createOrder(orderToSave);

        if (orderData.items && orderData.items.length > 0) {
            await this.saveOrderItems(order.id, orderData.items, userId);
        }

        const state = this.store.getState();
        this.store.setState({
            orders: [...state.orders, order]
        });

        return order;
    }

    /**
     * Atualiza um pedido existente
     */
    async updateOrder(orderId, updates) {
        if (!orderId) {
            throw new Error('ID do pedido é obrigatório');
        }

        const userId = this.store.getState().currentUser?.id;

        if (updates.items) {
            updates.total_value = this.calculateOrderTotal(updates);
        }

        const updatedOrder = await this.db.updateOrder(orderId, updates);

        if (updates.items) {
            await this.db.deleteOrderItems(orderId);
            await this.saveOrderItems(orderId, updates.items, userId);
        }

        const orders = this.store.getState().orders.map(o => 
            o.id === orderId ? { ...o, ...updatedOrder } : o
        );
        this.store.setState({ orders });

        return updatedOrder;
    }

    /**
     * Marca pedido como entregue
     */
    async markAsDelivered(orderId, motoboyId = null) {
        const updates = { 
            status: 'Concluído',
            delivered_at: new Date().toISOString()
        };

        if (motoboyId) {
            updates.motoboy_id = motoboyId;
        }

        return this.updateOrder(orderId, updates);
    }

    /**
     * Cancela um pedido
     */
    async cancelOrder(orderId, reason = null) {
        return this.updateOrder(orderId, {
            status: 'Cancelado',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason
        });
    }

    /**
     * Processa reembolso
     */
    async refundOrder(orderId) {
        const order = this.store.getState().orders.find(o => o.id === orderId);

        if (!order) {
            throw new Error('Pedido não encontrado');
        }

        if (order.status !== 'Concluído') {
            throw new Error('Apenas pedidos entregues podem ser reembolsados');
        }

        const userId = this.store.getState().currentUser?.id;

        // Criar despesa de reembolso
        await this.db.createExpense({
            user_id: userId,
            description: `Reembolso do Pedido #${orderId}`,
            amount: order.total_value,
            date: new Date().toISOString().split('T')[0],
            type: 'empresa'
        });

        return this.updateOrder(orderId, {
            status: 'Reembolsado',
            refunded_at: new Date().toISOString()
        });
    }

    /**
     * Calcula o total do pedido
     */
    calculateOrderTotal(orderData) {
        if (orderData.is_internal_consumption) {
            return 0;
        }

        const itemsTotal = (orderData.items || []).reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        const deliveryCost = orderData.delivery_cost || 0;
        
        return itemsTotal + deliveryCost;
    }

    /**
     * Valida dados do pedido
     */
    validateOrderData(orderData) {
        const errors = [];

        if (!orderData.is_internal_consumption && !orderData.customer_id) {
            errors.push('Cliente é obrigatório');
        }

        if (!orderData.items || orderData.items.length === 0) {
            errors.push('Adicione pelo menos um item ao pedido');
        }

        if (orderData.items) {
            orderData.items.forEach((item, index) => {
                if (!item.product_id) {
                    errors.push(`Item ${index + 1}: produto inválido`);
                }
                if (!item.quantity || item.quantity <= 0) {
                    errors.push(`Item ${index + 1}: quantidade inválida`);
                }
                if (item.price === undefined || item.price < 0) {
                    errors.push(`Item ${index + 1}: preço inválido`);
                }
            });
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

    /**
     * Salva itens do pedido
     */
    async saveOrderItems(orderId, items, userId) {
        const itemsToSave = items.map(item => ({
            order_id: orderId,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.price,
            user_id: userId
        }));

        return this.db.createOrderItems(itemsToSave);
    }

    /**
     * Obtém pedidos pendentes
     */
    getPendingOrders() {
        const state = this.store.getState();
        return state.orders.filter(o => o.status === 'Pendente');
    }

    /**
     * Obtém pedidos por cliente
     */
    getOrdersByCustomer(customerId) {
        const state = this.store.getState();
        return state.orders.filter(o => o.customer_id === customerId);
    }

    /**
     * Obtém estatísticas de pedidos
     */
    getOrderStats() {
        const orders = this.store.getState().orders;
        
        return {
            total: orders.length,
            pending: orders.filter(o => o.status === 'Pendente').length,
            delivered: orders.filter(o => o.status === 'Concluído').length,
            cancelled: orders.filter(o => o.status === 'Cancelado').length,
            revenue: orders
                .filter(o => o.status === 'Concluído')
                .reduce((sum, o) => sum + (o.total_value || 0), 0)
        };
    }

    /**
     * Calcula troco
     */
    calculateChange(total, amountReceived) {
        return amountReceived - total;
    }

    /**
     * Verifica se pode editar pedido
     */
    canEdit(order) {
        return order.status === 'Pendente';
    }

    /**
     * Verifica se pode cancelar pedido
     */
    canCancel(order) {
        return order.status === 'Pendente';
    }

    /**
     * Verifica se pode reembolsar pedido
     */
    canRefund(order) {
        return order.status === 'Concluído';
    }

    /**
     * Obtém resumo de pedidos do dia
     */
    getTodaySummary() {
        const today = new Date().toISOString().split('T')[0];
        const orders = this.store.getState().orders;
        
        const todayOrders = orders.filter(o => {
            const orderDate = new Date(o.created_at).toISOString().split('T')[0];
            return orderDate === today;
        });

        return {
            count: todayOrders.length,
            pending: todayOrders.filter(o => o.status === 'Pendente').length,
            delivered: todayOrders.filter(o => o.status === 'Concluído').length,
            revenue: todayOrders
                .filter(o => o.status === 'Concluído')
                .reduce((sum, o) => sum + (o.total_value || 0), 0)
        };
    }
}
