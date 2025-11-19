// Serviço de Pedidos - Lógica de negócio
export class OrderService {
    constructor(dbService, store) {
        this.db = dbService;
        this.store = store;
    }

    async createOrder(orderData) {
        this.validateOrderData(orderData);
        const total = this.calculateOrderTotal(orderData);
        
        const orderToSave = {
            ...orderData,
            total_value: total,
            status: orderData.status || 'Pendente',
            created_at: new Date().toISOString()
        };

        const order = await this.db.createOrder(orderToSave);

        if (orderData.items && orderData.items.length > 0) {
            await this.saveOrderItems(order.id, orderData.items);
        }

        this.store.setState({
            orders: [...this.store.getState().orders, order]
        });

        return order;
    }

    calculateOrderTotal(orderData) {
        if (orderData.is_internal_consumption) return 0;

        const itemsTotal = (orderData.items || []).reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        return itemsTotal + (orderData.delivery_cost || 0);
    }

    validateOrderData(orderData) {
        const errors = [];

        if (!orderData.is_internal_consumption && !orderData.customer_id) {
            errors.push('Cliente é obrigatório');
        }

        if (!orderData.items || orderData.items.length === 0) {
            errors.push('Adicione pelo menos um item ao pedido');
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

    async saveOrderItems(orderId, items) {
        const itemsToSave = items.map(item => ({
            order_id: orderId,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.price
        }));

        return this.db.createOrderItems(itemsToSave);
    }
}
