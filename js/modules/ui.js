/**
 * ui.js - Funções de interface do usuário
 * Este arquivo exporta funções de UI que são usadas em outros módulos
 */

let globalUIManager = null;

// Função para inicializar o UIManager globalmente
export const initUIManager = (uiManager) => {
  globalUIManager = uiManager;
};

// Funções de renderização que tentam usar o UIManager se disponível,
// mas também incluem fallback para manipulação direta do DOM
export const renderDashboard = () => {
  if (globalUIManager) {
    globalUIManager.navigate('dashboard');
  } else {
    // Fallback: manipular DOM diretamente se UIManager não estiver disponível
    // Esconder todas as páginas e mostrar apenas o dashboard
    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden');
    });

    const dashboardPage = document.getElementById('page-dashboard');
    if (dashboardPage) {
      dashboardPage.classList.remove('hidden');

      // Atualizar título do header se possível
      const headerTitle = document.getElementById('header-title');
      if (headerTitle) {
        headerTitle.textContent = 'Dashboard';
      }

      // Atualizar link ativo na navegação
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link');
      });

      const activeLink = document.querySelector('.nav-link[data-page="dashboard"]');
      if (activeLink) {
        activeLink.classList.add('active-link');
      }
    }
  }
};

export const renderDeliveries = () => {
  if (globalUIManager) {
    globalUIManager.navigate('deliveries');
  } else {
    // Fallback para entregas
    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden');
    });

    const deliveriesPage = document.getElementById('page-deliveries');
    if (deliveriesPage) {
      deliveriesPage.classList.remove('hidden');

      const headerTitle = document.getElementById('header-title');
      if (headerTitle) {
        headerTitle.textContent = 'Entregas';
      }

      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link');
      });

      const activeLink = document.querySelector('.nav-link[data-page="deliveries"]');
      if (activeLink) {
        activeLink.classList.add('active-link');
      }
    }
  }
};

export const renderHistory = () => {
  if (globalUIManager) {
    globalUIManager.navigate('history');
  } else {
    // Fallback para histórico
    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden');
    });

    const historyPage = document.getElementById('page-history');
    if (historyPage) {
      historyPage.classList.remove('hidden');

      const headerTitle = document.getElementById('header-title');
      if (headerTitle) {
        headerTitle.textContent = 'Histórico';
      }

      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link');
      });

      const activeLink = document.querySelector('.nav-link[data-page="history"]');
      if (activeLink) {
        activeLink.classList.add('active-link');
      }
    }
  }
};

export const renderCustomers = () => {
  if (globalUIManager) {
    globalUIManager.navigate('customers');
  } else {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden');
    });

    const customersPage = document.getElementById('page-customers');
    if (customersPage) {
      customersPage.classList.remove('hidden');

      const headerTitle = document.getElementById('header-title');
      if (headerTitle) {
        headerTitle.textContent = 'Clientes';
      }

      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link');
      });

      const activeLink = document.querySelector('.nav-link[data-page="customers"]');
      if (activeLink) {
        activeLink.classList.add('active-link');
      }
    }
  }
};

export const renderProducts = () => {
  if (globalUIManager) {
    globalUIManager.navigate('products');
  } else {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden');
    });

    const productsPage = document.getElementById('page-products');
    if (productsPage) {
      productsPage.classList.remove('hidden');

      const headerTitle = document.getElementById('header-title');
      if (headerTitle) {
        headerTitle.textContent = 'Serviços';
      }

      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link');
      });

      const activeLink = document.querySelector('.nav-link[data-page="products"]');
      if (activeLink) {
        activeLink.classList.add('active-link');
      }
    }
  }
};

export const renderInventory = () => {
  if (globalUIManager) {
    globalUIManager.navigate('inventory');
  } else {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden');
    });

    const inventoryPage = document.getElementById('page-inventory');
    if (inventoryPage) {
      inventoryPage.classList.remove('hidden');

      const headerTitle = document.getElementById('header-title');
      if (headerTitle) {
        headerTitle.textContent = 'Estoque';
      }

      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link');
      });

      const activeLink = document.querySelector('.nav-link[data-page="inventory"]');
      if (activeLink) {
        activeLink.classList.add('active-link');
      }
    }
  }
};

export const renderFinancials = () => {
  if (globalUIManager) {
    globalUIManager.navigate('financials');
  } else {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden');
    });

    const financialsPage = document.getElementById('page-financials');
    if (financialsPage) {
      financialsPage.classList.remove('hidden');

      const headerTitle = document.getElementById('header-title');
      if (headerTitle) {
        headerTitle.textContent = 'Financeiro';
      }

      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link');
      });

      const activeLink = document.querySelector('.nav-link[data-page="financials"]');
      if (activeLink) {
        activeLink.classList.add('active-link');
      }
    }
  }
};

export const renderMotoboysPage = () => {
  if (globalUIManager) {
    globalUIManager.navigate('motoboys');
  } else {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden');
    });

    const motoboysPage = document.getElementById('page-motoboys');
    if (motoboysPage) {
      motoboysPage.classList.remove('hidden');

      const headerTitle = document.getElementById('header-title');
      if (headerTitle) {
        headerTitle.textContent = 'Motoboys';
      }

      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link');
      });

      const activeLink = document.querySelector('.nav-link[data-page="motoboys"]');
      if (activeLink) {
        activeLink.classList.add('active-link');
      }
    }
  }
};

export const renderEmployeesPage = () => {
  if (globalUIManager) {
    globalUIManager.navigate('employees');
  } else {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden');
    });

    const employeesPage = document.getElementById('page-employees');
    if (employeesPage) {
      employeesPage.classList.remove('hidden');

      const headerTitle = document.getElementById('header-title');
      if (headerTitle) {
        headerTitle.textContent = 'Funcionários';
      }

      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link');
      });

      const activeLink = document.querySelector('.nav-link[data-page="employees"]');
      if (activeLink) {
        activeLink.classList.add('active-link');
      }
    }
  }
};

export const closeAllModals = () => {
  // Fechar todos os modais possíveis
  document.querySelectorAll('.modal, [id*="modal"], .popup, .dialog').forEach(modal => {
    modal.classList.add('hidden');
  });
};

export const updateNavigationVisibility = () => {
  if (globalUIManager) {
    globalUIManager.updateNavigationVisibility();
  } else {
    // Fallback: implementar lógica básica de visibilidade da navegação
    // A depender do contexto (armazenado em algum estado global)
    const currentUser = localStorage.getItem('current_user_role') ||
                       (localStorage.getItem('employee_session') ? 'caixa' : 'admin');

    const navLinks = document.querySelectorAll('.nav-link[data-page]');

    // Definir páginas permitidas por role
    const allowedPages = {
      admin: ['dashboard', 'deliveries', 'history', 'customers', 'products', 'inventory', 'financials', 'motoboys', 'employees'],
      caixa: ['dashboard', 'deliveries', 'history'],
      barbeiro: ['dashboard', 'financials']
    };

    const pagesToShow = allowedPages[currentUser] || allowedPages.admin;

    navLinks.forEach(link => {
      const pageId = link.getAttribute('data-page');
      if (pagesToShow.includes(pageId)) {
        link.style.display = 'flex';
      } else {
        link.style.display = 'none';
      }
    });
  }
};

export const updateUserInfo = (user) => {
  if (globalUIManager) {
    globalUIManager.updateUserInfo(user);
  } else {
    // Fallback: atualizar informações do usuário diretamente no DOM
    if (!user) return;

    const metadata = user.user_metadata || {};
    let displayName = 'Utilizador';

    if (metadata.full_name) {
      displayName = metadata.full_name;
    } else if (user.email) {
      displayName = user.email.split('@')[0]
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(name => name.charAt(0).toUpperCase() + name.slice(1))
        .join(' ');
    }

    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
      userNameEl.textContent = displayName;
    }

    // Atualizar avatar com inicial se não houver imagem
    const userAvatarInitials = document.getElementById('user-avatar-initials');
    if (userAvatarInitials) {
      const initial = displayName.charAt(0).toUpperCase();
      const span = userAvatarInitials.querySelector('span');
      if (span) {
        span.textContent = initial;
      }
    }
  }
};