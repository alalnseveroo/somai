/**
 * Helpers - Funções utilitárias reutilizáveis
 */

/**
 * Formata valores em moeda brasileira
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

/**
 * Formata data e hora
 */
export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });
}

/**
 * Formata apenas a data
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

/**
 * Obtém valor numérico de strings formatadas
 */
export function getNumericValue(value) {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;
  
  const numericString = value
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  
  const number = parseFloat(numericString);
  return isNaN(number) ? 0 : number;
}

/**
 * Máscara de moeda para inputs
 */
export function maskCurrency(event) {
  const input = event.target;
  let value = input.value.replace(/\D/g, '');

  if (!value) {
    input.value = "";
    return;
  }
  
  const numericValue = parseInt(value, 10) / 100;
  input.value = formatCurrency(numericValue);
}

/**
 * Mostra toast de notificação
 */
export function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  const messageEl = toast.querySelector('p');
  if (messageEl) {
    messageEl.textContent = message;
  }
  
  toast.className = 'toast fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-xl z-50';
  toast.classList.add(isError ? 'bg-red-500' : 'bg-green-600');
  toast.classList.remove('hidden');
  
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

/**
 * Mostra overlay de loading
 */
export function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

/**
 * Esconde overlay de loading
 */
export function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    // Usar setTimeout para garantir que a transição seja visível
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 200);
  }
}

/**
 * Debounce - Atrasa execução de função
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle - Limita frequência de execução
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Gera ID único
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clona objeto profundamente
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Formata telefone
 */
export function formatPhone(phone) {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

/**
 * Valida email
 */
export function isValidEmail(email) {
  const regex = /^\S+@\S+\.\S+$/;
  return regex.test(email);
}

/**
 * Sanitiza string HTML
 */
export function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Agrupa array por propriedade
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
}

/**
 * Ordena array por propriedade
 */
export function sortBy(array, key, ascending = true) {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
}
