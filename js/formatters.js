// Utilitários de formatação
export const formatters = {
    currency(value) {
        return new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        }).format(value || 0);
    },

    dateTime(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
        });
    },

    date(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC'
        });
    },

    getNumericValue(value) {
        if (typeof value === 'number') return value;
        if (!value || typeof value !== 'string') return 0;
        const numericString = value
            .replace('R$', '')
            .replace(/\./g, '')
            .replace(',', '.')
            .trim();
        const number = parseFloat(numericString);
        return isNaN(number) ? 0 : number;
    },

    maskCurrency(event) {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');

        if (!value) {
            input.value = "";
            return;
        }
        
        const numericValue = parseInt(value, 10) / 100;
        input.value = this.currency(numericValue);
    }
};
