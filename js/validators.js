// Utilitários de validação
export const validators = {
    /**
     * Valida email
     */
    email(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Valida telefone brasileiro
     */
    phone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length === 10 || cleaned.length === 11;
    },

    /**
     * Valida senha
     */
    password(password) {
        return password && password.length >= 6;
    },

    /**
     * Valida campo obrigatório
     */
    required(value) {
        return value !== null && value !== undefined && value !== '';
    },

    /**
     * Valida número positivo
     */
    positiveNumber(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    },

    /**
     * Valida número não negativo
     */
    nonNegativeNumber(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
    },

    /**
     * Valida quantidade mínima
     */
    minLength(value, min) {
        return value && value.length >= min;
    },

    /**
     * Valida quantidade máxima
     */
    maxLength(value, max) {
        return value && value.length <= max;
    }
};

/**
 * Valida objeto completo baseado em regras
 */
export function validate(data, rules) {
    const errors = {};

    Object.keys(rules).forEach(field => {
        const fieldRules = rules[field];
        const value = data[field];

        fieldRules.forEach(rule => {
            if (typeof rule === 'function') {
                if (!rule(value)) {
                    errors[field] = errors[field] || [];
                    errors[field].push('Valor inválido');
                }
            } else if (typeof rule === 'object') {
                const { validator, message } = rule;
                if (!validator(value)) {
                    errors[field] = errors[field] || [];
                    errors[field].push(message);
                }
            }
        });
    });

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
