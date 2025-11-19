/**
 * EmployeeService - Serviço para gestão de funcionários
 */
export class EmployeeService {
  constructor(dbService, state, authService) {
    this.db = dbService;
    this.state = state;
    this.authService = authService;
  }

  /**
   * Carrega todos os funcionários
   */
  async loadEmployees() {
    try {
      let tenantId = this.state.get('tenantId');
      console.log('Tenant ID no loadEmployees:', tenantId);
      
      if (!tenantId) {
        // Tentar obter o tenantId de outras fontes
        const currentUser = this.state.get('currentUser');
        const currentEmployee = this.state.get('currentEmployee');
        
        console.log('CurrentUser no loadEmployees:', currentUser);
        console.log('CurrentEmployee no loadEmployees:', currentEmployee);
        
        // Verificar se o tenantId está em currentUser ou currentEmployee
        if (currentUser && currentUser.tenant && currentUser.tenant.id) {
          tenantId = currentUser.tenant.id;
          this.state.set('tenantId', tenantId);
        } else if (currentEmployee && currentEmployee.tenant && currentEmployee.tenant.id) {
          tenantId = currentEmployee.tenant.id;
          this.state.set('tenantId', tenantId);
        } else {
          console.warn('Tenant ID not found, cannot load employees.');
          return [];
        }
      }
      
      console.log('Buscando funcionários para tenant:', tenantId);
      
      const { data, error } = await this.db.client
        .from('employees')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      
      console.log('Funcionários carregados:', data?.length || 0);
      this.state.set('employees', data || []);
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      throw error;
    }
  }

  /**
   * Adiciona um novo funcionário (e cria seu login)
   */
  async addEmployee(employeeData) {
    try {
      const tenantId = this.state.get('tenantId');
      console.log('Tenant ID no EmployeeService:', tenantId);
      
      if (!tenantId) {
        // Tentar obter o tenantId de outras fontes
        const currentUser = this.state.get('currentUser');
        const currentEmployee = this.state.get('currentEmployee');
        
        console.log('CurrentUser:', currentUser);
        console.log('CurrentEmployee:', currentEmployee);
        
        // Verificar se o tenantId está em currentUser ou currentEmployee
        if (currentUser && currentUser.tenant && currentUser.tenant.id) {
          this.state.set('tenantId', currentUser.tenant.id);
        } else if (currentEmployee && currentEmployee.tenant && currentEmployee.tenant.id) {
          this.state.set('tenantId', currentEmployee.tenant.id);
        } else {
          throw new Error('Tenant ID is required to add an employee.');
        }
      }

      // Verificar se o método addEmployeeToTenant existe no authService
      if (typeof this.authService.addEmployeeToTenant !== 'function') {
        console.error('Método addEmployeeToTenant não encontrado no authService!', this.authService);
        throw new Error('Serviço de autenticação não disponível.');
      }

      // Verificar limite de funcionários do plano
      await this._enforceEmployeeLimit(tenantId);

      console.log('Chamando addEmployeeToTenant com dados:', employeeData, 'e tenantId:', tenantId);
      // Chama o AuthService para criar o usuário e associá-lo ao tenant
      const authData = await this.authService.addEmployeeToTenant(employeeData, tenantId);
      console.log('Funcionário criado com sucesso:', authData.user.id);

      // O registro na tabela 'employees' agora é feito dentro de addEmployeeToTenant
      // Apenas precisamos atualizar o estado local
      const { data: newEmployee, error } = await this.db.client
        .from('employees')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (error) throw error;

      const employees = this.state.get('employees') || [];
      this.state.set('employees', [...employees, newEmployee]);

      return newEmployee;
    } catch (error) {
      console.error('Erro ao adicionar funcionário:', error);
      throw error;
    }
  }

  /**
   * Cria um novo barbeiro com login
   */
  async createBarber(employeeData, password) {
    console.log('Criando barbeiro com dados:', employeeData, 'e senha:', password);
    
    // Verificar se o método createEmployee existe
    if (typeof this.createEmployee !== 'function') {
      console.error('Método createEmployee não encontrado!', this);
      throw new Error('Método createEmployee não encontrado!');
    }
    return this.createEmployee({ ...employeeData, password });
  }

  /**
   * Cria um novo funcionário
   */
  async createEmployee(employeeData) {
    try {
      const tenantId = this.state.get('tenantId');
      console.log('Tenant ID no createEmployee:', tenantId);
      
      if (!tenantId) {
        // Tentar obter o tenantId de outras fontes
        const currentUser = this.state.get('currentUser');
        const currentEmployee = this.state.get('currentEmployee');
        
        console.log('CurrentUser no createEmployee:', currentUser);
        console.log('CurrentEmployee no createEmployee:', currentEmployee);
        
        // Verificar se o tenantId está em currentUser ou currentEmployee
        if (currentUser && currentUser.tenant && currentUser.tenant.id) {
          this.state.set('tenantId', currentUser.tenant.id);
        } else if (currentEmployee && currentEmployee.tenant && currentEmployee.tenant.id) {
          this.state.set('tenantId', currentEmployee.tenant.id);
        } else {
          throw new Error('Tenant ID is required to create an employee.');
        }
      }

      // Verificar limite de funcionários do plano
      await this._enforceEmployeeLimit(tenantId);

      console.log('Chamando addEmployeeToTenant com dados:', employeeData, 'e tenantId:', tenantId);
      // Chama o AuthService para criar o usuário e associá-lo ao tenant
      const authData = await this.authService.addEmployeeToTenant(employeeData, tenantId);
      console.log('Funcionário criado com sucesso:', authData.user.id);

      // O registro na tabela 'employees' agora é feito dentro de addEmployeeToTenant
      // Apenas precisamos atualizar o estado local
      const { data: newEmployee, error } = await this.db.client
        .from('employees')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (error) throw error;

      const employees = this.state.get('employees') || [];
      this.state.set('employees', [...employees, newEmployee]);

      return newEmployee;
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      throw error;
    }
  }

  async _enforceEmployeeLimit(tenantId) {
    const plan = this.state.get('subscriptionPlan');
    const maxEmployees = plan?.max_employees_per_tenant ?? 5;
    try {
      const { data, count, error } = await this.db.client
        .from('tenant_users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .neq('role', 'admin');
      if (error) throw error;
      const currentCount = count ?? 0;
      if (currentCount >= maxEmployees) {
        throw new Error('Limite de funcionários do seu plano foi atingido (5).');
      }
      return true;
    } catch (err) {
      console.error('Erro ao verificar limite de funcionários:', err);
      throw err;
    }
  }

  /**
   * Valida login de funcionário
   */
  async loginEmployee(email, password) {
    try {
      console.log('Validando login de funcionário:', email);
      
      const { data, error } = await this.db.client
        .from('employees')
        .select('*')
        .ilike('email', email)
        .limit(1)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Funcionário não encontrado');
      if (data.pin !== password) throw new Error('Senha incorreta');

      console.log('Login de funcionário validado com sucesso:', data.id);
      return data;
    } catch (error) {
      console.error('Erro ao validar login de funcionário:', error);
      throw error;
    }
  }

  /**
   * Obtém permissões do funcionário por role
   */
  getPermissions(role) {
    console.log('Obtendo permissões para role:', role);
    
    const permissions = {
      admin: [
        'view:dashboard',
        'view:deliveries',
        'view:history',
        'view:customers',
        'view:products',
        'view:inventory',
        'view:financials',
        'view:employees',
        'manage:orders',
        'manage:customers',
        'manage:products',
        'manage:employees',
        'manage:cash'
      ],
      caixa: [
        'view:dashboard',
        'view:deliveries',
        'view:history',
        'manage:orders',
        'manage:cash'
      ],
      barbeiro: [
        'view:dashboard',
        'view:financials',
        'manage:orders'
      ]
    };

    const perms = permissions[role] || [];
    console.log('Permissões obtidas:', perms);
    return perms;
  }

  /**
   * Verifica se funcionário tem permissão
   */
  hasPermission(role, permission) {
    console.log('Verificando permissão:', permission, 'para role:', role);
    
    const permissions = this.getPermissions(role);
    const hasPerm = permissions.includes(permission);
    
    console.log('Tem permissão:', hasPerm);
    return hasPerm;
  }

  /**
   * Obtém ID do usuário correto (considerando funcionário)
   */
  _getUserId() {
    const isEmployee = this.state.get('isEmployee');
    console.log('Obtendo ID do usuário. É funcionário:', isEmployee);
    
    const userId = isEmployee 
      ? this.state.get('ownerUserId')
      : this.state.get('currentUser')?.id;
      
    console.log('ID do usuário obtido:', userId);
    return userId;
  }
}
