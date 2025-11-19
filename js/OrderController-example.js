// Controller de Pedidos - Orquestração
export class OrderController {
    constructor(orderService, uiHelpers) {
        this.service = orderService;
        this.ui = uiHelpers;
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            
            if (action === 'create-order') {
                this.handleCreateOrder(e);
            }
        });
    }

    async handleCreateOrder(event) {
        event.preventDefault();
        
        try {
            this.ui.showLoading();
            
            const formData = this.collectFormData();
            const order = await this.service.createOrder(formData);
            
            this.ui.showToast('Pedido criado com sucesso!');
            this.ui.showSaleNotification(order.total_value);
            
        } catch (error) {
            this.ui.showToast(error.message, true);
        } finally {
            this.ui.hideLoading();
        }
    }

    collectFormData() {
        return {
            customer_id: document.getElementById('customer-id').value,
            items: this.collectItems(),
            payment_method: document.getElementById('payment').value
        };
    }

    collectItems() {
        const items = [];
        document.querySelectorAll('.order-item').forEach(el => {
            items.push({
                product_id: el.dataset.productId,
                quantity: parseInt(el.querySelector('.quantity').value),
                price: parseFloat(el.dataset.price)
            });
        });
        return items;
    }
}
