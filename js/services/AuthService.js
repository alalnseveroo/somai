import { eventBus } from '../core/EventBus.js';
import { modal } from '../ui/components/Modal.js';

/**
 * AuthService - Gerencia autenticação e autorização
 */
export class AuthService {
  constructor(supabaseClient, appState) {
    this.client = supabaseClient;
    this.state = appState;
    this._provisioningUser = false;
  }

  /**
   * Configura listener de autenticação
   */
  setupAuthListener() {
    console.log('Configurando listener de autenticação');
    
    this.client.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this._handleSignIn(session, event);
      } else if (event === 'SIGNED_OUT') {
        this._handleSignOut();
      } else if (event === 'USER_UPDATED') {
        this._handleSignIn(session, event);
      }
    });
  }

  /**
   * Renderiza a view de autenticação
   */
  renderAuthView() {
    console.log('Renderizando view de autenticação');
    
    const container = document.getElementById('auth-container');
    if (!container) {
      console.error('Container de autenticação não encontrado');
      return;
    }

    const isLoginView = this.state.get('isLoginView') !== false; // default to true
    console.log('Modo de exibição:', isLoginView ? 'Login' : 'Cadastro');

    container.innerHTML = `
      <div id="auth-view" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
        <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div class="text-center mb-8">
            <div class="mx-auto bg-indigo-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
              <i data-lucide="scissors" class="w-8 h-8 text-indigo-600"></i>
            </div>
            <h1 class="text-2xl font-bold text-slate-900">
              ${isLoginView ? 'Acesse sua conta' : 'Crie sua conta'}
            </h1>
            <p class="text-slate-600 mt-2">
              ${isLoginView ? 'Entre com suas credenciais' : 'Cadastre-se para começar'}
            </p>
          </div>

          <form id="auth-form" class="space-y-6">
            ${!isLoginView ? `
              <div>
                <label for="full-name" class="block text-sm font-medium text-slate-700 mb-2">
                  Nome Completo
                </label>
                <input type="text" 
                       id="full-name" 
                       required
                       class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                       placeholder="Seu nome completo">
              </div>
            ` : ''}

            <div>
              <label for="email" class="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input type="email" 
                     id="email" 
                     required
                     class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                     placeholder="seu@email.com">
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-slate-700 mb-2">
                Senha
              </label>
              <input type="password" 
                     id="password" 
                     required
                     minlength="6"
                     class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                     placeholder="••••••••">
            </div>

            <button type="submit" 
                    class="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              ${isLoginView ? 'Entrar' : 'Cadastrar'}
            </button>

            <div class="text-center">
              <button type="button" 
                      id="toggle-auth-view"
                      class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                ${isLoginView ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
              </button>
            </div>
          </form>

          <div class="mt-6 pt-6 border-t border-slate-200">
            <button id="employee-login-btn" 
                    class="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium py-2">
              <i data-lucide="user" class="w-4 h-4"></i>
              Entrar como funcionário
            </button>
          </div>
        </div>
      </div>
    `;

    // Inicializar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Anexar event listeners
    this._attachAuthEventListeners();
  }

  /**
   * Anexa event listeners à view de autenticação
   */
  _attachAuthEventListeners() {
    console.log('Anexando event listeners à view de autenticação');
    
    const form = document.getElementById('auth-form');
    const toggleBtn = document.getElementById('toggle-auth-view');
    const employeeLoginBtn = document.getElementById('employee-login-btn');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this._handleAuthFormSubmit();
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        console.log('Alternando modo de autenticação');
        this.state.set('isLoginView', !this.state.get('isLoginView'));
        this.renderAuthView();
      });
    }

    if (employeeLoginBtn) {
      employeeLoginBtn.addEventListener('click', () => {
        console.log('Abrindo modal de login de funcionário');
        this._showEmployeeLoginModal();
      });
    }
  }

  /**
   * Exibe modal de login de funcionário
   */
  _showEmployeeLoginModal() {
    console.log('Exibindo modal de login de funcionário');
    
    const content = `
      <form id="employee-login-form" class="space-y-4">
        <div>
          <label for="employee-email" class="block text-sm font-medium text-slate-700 mb-2">
            Email
          </label>
          <input type="email" 
                 id="employee-email" 
                 required
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="seu@email.com">
        </div>
        
        <div>
          <label for="employee-password" class="block text-sm font-medium text-slate-700 mb-2">
            Senha
          </label>
          <input type="password" 
                 id="employee-password" 
                 required
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="••••••••">
        </div>
        
        <div class="flex gap-3 pt-4">
          <button type="button" 
                  id="cancel-employee-login-btn"
                  class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-300 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" 
                  class="flex-1 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm">
            Entrar
          </button>
        </div>
      </form>
    `;

    modal.open('Login de Funcionário', content, { size: 'small' });

    // Event listeners
    const form = document.getElementById('employee-login-form');
    const cancelBtn = document.getElementById('cancel-employee-login-btn');

    cancelBtn?.addEventListener('click', () => {
      console.log('Cancelando login de funcionário');
      modal.close();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleEmployeeLoginFormSubmit();
    });
  }

  /**
   * Processa envio do formulário de autenticação
   */
  async _handleAuthFormSubmit() {
    console.log('Processando envio do formulário de autenticação');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('full-name');

    if (this.state.get('isLoginView')) {
      console.log('Realizando login de administrador:', email);
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        console.log('Login de administrador realizado com sucesso');
      } catch (error) {
        console.error('Erro no login de administrador:', error);
        eventBus.emit('toast:show', { message: 'Email ou senha inválidos.', isError: true });
      }
    } else {
      console.log('Realizando cadastro de administrador:', email);
      if (!fullName) {
        eventBus.emit('toast:show', { message: 'Nome completo é obrigatório.', isError: true });
        return;
      }
      try {
        await this.signUp(email, password, fullName.value);
        console.log('Cadastro de administrador realizado com sucesso');
        try {
          await this.client.auth.signInWithPassword({ email, password });
          console.log('Login automático após cadastro realizado');
        } catch (e) {
          console.warn('Falha no login automático após cadastro:', e);
        }
      } catch (error) {
        console.error('Erro no cadastro de administrador:', error);
        eventBus.emit('toast:show', { message: 'Erro ao cadastrar. Tente novamente.', isError: true });
      }
    }
  }

  /**
   * Verifica se há sessão de funcionário
   */
  checkEmployeeSession() {
    console.log('Verificando sessão de funcionário');
    
    const sessionData = localStorage.getItem('employee_session');
    if (!sessionData) {
      console.log('Nenhuma sessão de funcionário encontrada');
      return null;
    }

    try {
      const session = JSON.parse(sessionData);
      console.log('Sessão de funcionário encontrada:', session);
      
      // Verificar se a sessão ainda é válida (menos de 24 horas)
      const loginTime = new Date(session.loginTime);
      const now = new Date();
      const diffHours = Math.abs(now - loginTime) / 36e5;
      
      if (diffHours > 24) {
        // Sessão expirada
        console.log('Sessão de funcionário expirada');
        localStorage.removeItem('employee_session');
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Erro ao parsear sessão de funcionário:', error);
      localStorage.removeItem('employee_session');
      return null;
    }
  }

  /**
   * Login de cliente (não utilizado atualmente)
   */
  async loginCustomer(email, password) {
    console.log('Realizando login de cliente:', email);
    
    // Esta função não é utilizada atualmente
    // Mantida para compatibilidade futura
    throw new Error('Login de cliente não implementado');
  }

  /**

   * Login de funcionário (com verificação de registro)

   */
  async loginEmployee(email, password) {
    console.log('Realizando login de funcionário:', email);
    
    const { data: user, error: loginError } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) throw loginError;

    if (!user) throw new Error('User not found.');

    const { data: tenantUser, error: tenantError } = await this.client
      .from('tenant_users')
      .select('*, tenants(*)')
      .eq('user_id', user.user.id)
      .single();

    if (tenantError) throw tenantError;

    if (!tenantUser) throw new Error('User is not part of any tenant.');

    const sessionData = {
      ...user,
      tenant: tenantUser.tenants,
      role: tenantUser.role,
    };

    this.state.set({
      currentUser: sessionData,
      isEmployee: true,
      currentEmployee: sessionData,
      tenantId: tenantUser.tenant_id,
    });

    eventBus.emit('auth:employee-login', sessionData);
    console.log('Login de funcionário realizado com sucesso');
    return sessionData;
  }



  /**

   * Cadastro de novo usuário (e criação de tenant)

   */
  async signUp(email, password, fullName) {
    console.log('Realizando cadastro de novo usuário:', email, fullName);
    
    const { data: authData, error: signUpError } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (signUpError) throw signUpError;

    if (!authData.user) throw new Error('User registration failed.');

    const { data: currentSession } = await this.client.auth.getSession();
    if (!currentSession?.session) {
      try {
        await this.client.auth.signInWithPassword({ email, password });
      } catch (e) {
        console.warn('Não foi possível autenticar automaticamente após signUp:', e);
      }
    }

    const { data: newTenant, error: tenantError } = await this.client
      .from('tenants')
      .insert({ owner_id: authData.user.id, name: `${fullName}'s Company` })
      .select()
      .single();

    if (tenantError) throw tenantError;

    const { error: tenantUserError } = await this.client
      .from('tenant_users')
      .insert({ tenant_id: newTenant.id, user_id: authData.user.id, role: 'admin' });

    if (tenantUserError) throw tenantUserError;

    // Vincular plano ao usuário admin
    const { error: planInsertError } = await this.client
      .from('user_plans')
      .insert({ user_id: authData.user.id, plan_name: 'basic', active: true });
    if (planInsertError) throw planInsertError;

    console.log('Cadastro de novo usuário realizado com sucesso');
    return authData;
  }

  

  /**

   * Adiciona um novo funcionário a um tenant existente

   */
  async addEmployeeToTenant(employeeData, tenantId) {
    console.log('Adicionando funcionário ao tenant:', tenantId);
    console.log('Dados do funcionário:', employeeData);
    
    // Verificar se os dados necessários estão presentes
    if (!employeeData || !employeeData.email || !employeeData.password) {
      throw new Error('Dados de funcionário incompletos.');
    }
    
    if (!tenantId) {
      throw new Error('ID de tenant não fornecido.');
    }
    
    const { data: originalSession } = await this.client.auth.getSession();
    this._provisioningUser = true;
    const { data: authData, error: signUpError } = await this.client.auth.signUp({
      email: employeeData.email,
      password: employeeData.password,
      options: {
        data: { full_name: employeeData.name },
      },
    });

    if (signUpError) { this._provisioningUser = false; throw signUpError; }
    if (!authData.user) { this._provisioningUser = false; throw new Error('Employee registration failed.'); }
    
    console.log('Usuário criado com sucesso:', authData.user.id);
    if (originalSession?.session) {
      const { access_token, refresh_token } = originalSession.session;
      try { await this.client.auth.setSession({ access_token, refresh_token }); } catch {}
    }

    const { error: tenantUserError } = await this.client
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id: authData.user.id,
        role: employeeData.role,
      });
    
    console.log('Registro em tenant_users criado com sucesso');

    if (tenantUserError) { this._provisioningUser = false; throw tenantUserError; }

    // Agora, inserir na tabela public.employees
    // Note que o tenant_id será automaticamente atribuído pelo trigger do banco de dados
    const { error: employeeInsertError } = await this.client
      .from('employees')
      .insert({
        user_id: authData.user.id,
        name: employeeData.name,
        email: employeeData.email,
        pin: employeeData.password, // Usar a senha como PIN
        role: employeeData.role
        // tenant_id será automaticamente atribuído pelo trigger
      });
    
    console.log('Registro em employees criado com sucesso');

    if (employeeInsertError) {
      // Opcional: Tratar limpeza se esta etapa falhar
      console.error('Falha ao inserir na tabela employees:', employeeInsertError);
      // Você pode querer deletar o usuário de auth.users e tenant_users aqui
      this._provisioningUser = false;
      throw employeeInsertError;
    }

    this._provisioningUser = false;
    return authData;
  }

  
  /**
   * Logout
   */
  async logout() {
    console.log('Realizando logout');
    
    const employeeSession = this.checkEmployeeSession();

    if (employeeSession) {
      // Logout de funcionário
      console.log('Logout de funcionário');
      localStorage.removeItem('employee_session');
      eventBus.emit('auth:employee-logout');
    } else {
      // Logout de admin
      console.log('Logout de admin');
      await this.client.auth.signOut();
    }

    this.state.reset();
    eventBus.emit('auth:logout');
  }

  /**
   * Obtém sessão atual
   */
  async getSession() {
    console.log('Obtendo sessão atual');
    
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    console.log('Sessão obtida:', data.session?.user?.id);
    return data.session;
  }

  /**
   * Obtém usuário atual
   */
  async getUser() {
    console.log('Obtendo usuário atual');
    
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    console.log('Usuário obtido:', data.user?.id);
    return data.user;
  }

  /**
   * Verifica permissões
   */
  can(permission) {
    console.log('Verificando permissão:', permission);
    
    const role = this.state.getUserRole();
    console.log('Role do usuário:', role);
    
    const permissions = this._getPermissionsByRole(role);
    const hasPermission = permissions.includes(permission);
    
    console.log('Tem permissão:', hasPermission);
    return hasPermission;
  }

  /**
   * Verifica se tem alguma das permissões
   */
  canAny(permissions) {
    console.log('Verificando se tem alguma das permissões:', permissions);
    
    const result = permissions.some(permission => this.can(permission));
    console.log('Tem alguma permissão:', result);
    return result;
  }

  /**
   * Verifica se tem todas as permissões
   */
  canAll(permissions) {
    console.log('Verificando se tem todas as permissões:', permissions);
    
    const result = permissions.every(permission => this.can(permission));
    console.log('Tem todas as permissões:', result);
    return result;
  }

  /**
   * Handler de login
   */
  async _handleSignIn(session, event) {
    console.log('Handling sign in event:', event);
    if (this._provisioningUser) {
      return;
    }
    
    const employeeSession = this.checkEmployeeSession();
    if (employeeSession) {
      console.log('⏭️ Sessão de funcionário ativa, ignorando auth state change');
      return;
    }

    if (!session || !session.user) {
      console.log('Sessão inválida no auth state change');
      return;
    }

    this.state.set('currentUser', session.user);
    try {
      await this._ensureEmployeeRecord(session.user);
    } catch (e) {
      console.warn('Falha ao garantir registro de funcionário:', e);
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      eventBus.emit('auth:login', session.user);
    } else if (event === 'USER_UPDATED') {
      eventBus.emit('auth:user-updated', session.user);
    }
  }

  /**
   * Handler de logout
   */
  async _handleSignOut() {
    console.log('Handling sign out');
    
    this.state.set({
      isInitialized: false,
      currentUser: null,
      currentEmployee: null,
      isEmployee: false
    });

    eventBus.emit('auth:logout');
  }

  /**
   * Garante que o usuário tenha registro de funcionário
   */
  async _ensureEmployeeRecord(user) {
    console.log('Garantindo registro de funcionário para usuário:', user.id);
    
    const { data: existing } = await this.client
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      const fullName = user.user_metadata?.full_name || 
                       user.email.split('@')[0] || 
                       'Usuário';
      console.log('Criando registro de funcionário para:', fullName);
      await this._createEmployeeRecord(user.id, fullName, user.email);
    } else {
      console.log('Registro de funcionário já existe');
    }
  }

  /**
   * Cria registro de funcionário
   */
  async _createEmployeeRecord(userId, name, email) {
    console.log('Criando registro de funcionário:', name, userId, email);
    
    try {
      await this.client.from('employees').insert({
        user_id: userId,
        name,
        email,
        role: 'admin'
      });
      console.log('✅ Registro de funcionário criado:', name);
    } catch (error) {
      console.error('❌ Erro ao criar funcionário:', error);
    }
  }

  /**
   * Processa envio do formulário de login de funcionário
   */
  async _handleEmployeeLoginFormSubmit() {
    console.log('Processando envio do formulário de login de funcionário');
    
    const email = document.getElementById('employee-email').value;
    const password = document.getElementById('employee-password').value;

    try {
      console.log('Realizando login de funcionário:', email);
      const session = await this.loginEmployee(email, password);
      
      // Salvar sessão no localStorage
      const sessionData = {
        ...session,
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('employee_session', JSON.stringify(sessionData));
      
      modal.close();
      
      eventBus.emit('auth:employee-login', session);
      console.log('Login de funcionário realizado com sucesso');
    } catch (error) {
      console.error('Erro no login de funcionário:', error);
      eventBus.emit('toast:show', { 
        message: 'Credenciais inválidas ou funcionário não encontrado.', 
        isError: true 
      });
    }
  }

  /**
   * Obtém permissões por role
   */
  _getPermissionsByRole(role) {
    console.log('Obtendo permissões por role:', role);
    
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
}