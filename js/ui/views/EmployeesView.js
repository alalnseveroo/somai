/**
 * EmployeesView - View para gestão de funcionários
 */
import { eventBus } from '../../core/EventBus.js';
import { formatDateTime } from '../../utils/helpers.js';
import { modal } from '../components/Modal.js';

export class EmployeesView {
  constructor(state, services) {
    this.state = state;
    this.services = services;
    
    // Verificar se o serviço de funcionários está disponível
    if (!this.services.employee) {
      console.error('Serviço de funcionários não encontrado!');
      throw new Error('Serviço de funcionários não encontrado!');
    }
  }

  /**
   * Renderiza a página de funcionários
   */
  render() {
    console.log('Renderizando view de funcionários com serviços:', this.services);
    
    const page = document.getElementById('page-employees');
    if (!page) return;

    const employees = this.state.get('employees') || [];

    page.innerHTML = `
      <div class="space-y-6">
        ${this._renderHeader(employees)}
        ${this._renderRoleFilter()}
        ${this._renderEmployeesGrid(employees)}
      </div>
    `;

    this._attachEventListeners();
  }

  /**
   * Renderiza cabeçalho
   */
  _renderHeader(employees) {
    console.log('Renderizando cabeçalho com funcionários:', employees.length);
    
    const roles = {
      admin: employees.filter(e => e.role === 'admin').length,
      caixa: employees.filter(e => e.role === 'caixa').length,
      barbeiro: employees.filter(e => e.role === 'barbeiro').length
    };

    return `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Funcionários</h2>
            <p class="text-sm text-slate-600 mt-1">
              Total de ${employees.length} funcionários
            </p>
          </div>
          <button id="add-employee-btn" 
                  class="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg 
                         hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            Novo Funcionário
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
            <h3 class="text-xs font-medium text-purple-800">Administradores</h3>
            <p class="text-2xl font-bold text-purple-900 mt-1">${roles.admin}</p>
          </div>
          <div class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <h3 class="text-xs font-medium text-blue-800">Caixas</h3>
            <p class="text-2xl font-bold text-blue-900 mt-1">${roles.caixa}</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
            <h3 class="text-xs font-medium text-green-800">Barbeiros</h3>
            <p class="text-2xl font-bold text-green-900 mt-1">${roles.barbeiro}</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza filtro de roles
   */
  _renderRoleFilter() {
    console.log('Renderizando filtro de roles');
    
    return `
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-sm font-medium text-slate-700">Filtrar por cargo:</span>
          <button data-filter="all" class="filter-btn active px-4 py-2 rounded-lg text-sm font-medium 
                                          bg-indigo-600 text-white">
            Todos
          </button>
          <button data-filter="admin" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium 
                                            bg-slate-100 text-slate-700 hover:bg-slate-200">
            Administrador
          </button>
          <button data-filter="caixa" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium 
                                            bg-slate-100 text-slate-700 hover:bg-slate-200">
            Caixa
          </button>
          <button data-filter="barbeiro" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium 
                                              bg-slate-100 text-slate-700 hover:bg-slate-200">
            Barbeiro
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza grid de funcionários
   */
  _renderEmployeesGrid(employees) {
    console.log('Renderizando grid de funcionários com:', employees.length, 'funcionários');
    
    const roleFilter = this.state.get('employeeRoleFilter') || 'all';
    console.log('Filtro de role aplicado:', roleFilter);
    
    const filteredEmployees = roleFilter === 'all' 
      ? employees 
      : employees.filter(e => e.role === roleFilter);
      
    console.log('Funcionários filtrados:', filteredEmployees.length);

    if (filteredEmployees.length === 0) {
      return `
        <div class="bg-white p-8 rounded-xl shadow-sm text-center">
          <i data-lucide="users" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
          <p class="text-slate-500">
            ${roleFilter !== 'all' ? 'Nenhum funcionário encontrado neste cargo' : 'Nenhum funcionário cadastrado'}
          </p>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${filteredEmployees.map(employee => this._renderEmployeeCard(employee)).join('')}
      </div>
    `;
  }

  /**
   * Renderiza card de funcionário
   */
  _renderEmployeeCard(employee) {
    console.log('Renderizando card de funcionário:', employee);
    
    const roleColors = {
      admin: 'bg-purple-100 text-purple-800 border-purple-500',
      caixa: 'bg-blue-100 text-blue-800 border-blue-500',
      barbeiro: 'bg-green-100 text-green-800 border-green-500'
    };

    const roleLabels = {
      admin: 'Administrador',
      caixa: 'Caixa',
      barbeiro: 'Barbeiro'
    };

    const permissions = this.services.employee.getPermissions(employee.role);

    return `
      <div class="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <button class="employee-avatar-upload-btn w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden" data-employee-id="${employee.id}" title="Trocar foto">
              ${employee.avatar_url ? `
                <img src="${employee.avatar_url}" alt="Avatar" class="w-12 h-12 object-cover" />
              ` : `
                <span class="text-indigo-600 font-bold text-lg">
                  ${employee.name?.charAt(0).toUpperCase() || '?'}
                </span>
              `}
            </button>
            <div>
              <h3 class="font-bold text-slate-900">${employee.name || 'Sem nome'}</h3>
              <span class="inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${roleColors[employee.role] || 'bg-slate-100 text-slate-800'}">
                ${roleLabels[employee.role] || employee.role}
              </span>
              <button class="change-photo-btn text-xs text-indigo-600 hover:underline mt-1" data-employee-id="${employee.id}">Alterar foto</button>
            </div>
          </div>
          
          <div class="flex gap-1">
            <button data-employee-id="${employee.id}" 
                    class="edit-employee-btn text-blue-600 hover:text-blue-700 p-1">
              <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            ${employee.role !== 'admin' ? `
              <button data-employee-id="${employee.id}" 
                      class="delete-employee-btn text-red-600 hover:text-red-700 p-1">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <div class="space-y-2 text-sm mb-4">
          ${employee.email ? `
            <div class="flex items-center gap-2 text-slate-700">
              <i data-lucide="mail" class="w-4 h-4 text-slate-400"></i>
              <span class="text-xs">${employee.email}</span>
            </div>
          ` : ''}
          
          ${employee.pin ? `
            <div class="flex items-center gap-2 text-slate-700">
              <i data-lucide="lock" class="w-4 h-4 text-slate-400"></i>
              <span class="text-xs">PIN configurado</span>
            </div>
          ` : `
            <div class="flex items-center gap-2 text-amber-600">
              <i data-lucide="alert-triangle" class="w-4 h-4"></i>
              <span class="text-xs">PIN não configurado</span>
            </div>
          `}
        </div>

        <div class="pt-3 border-t border-slate-200">
          <p class="text-xs font-medium text-slate-500 mb-2">Permissões (${permissions.length}):</p>
          <div class="flex flex-wrap gap-1">
            ${permissions.slice(0, 3).map(perm => `
              <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                ${perm.split(':')[1]}
              </span>
            `).join('')}
            ${permissions.length > 3 ? `
              <span class="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs rounded font-medium">
                +${permissions.length - 3}
              </span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Anexa event listeners
   */
  _attachEventListeners() {
    console.log('Anexando event listeners');
    
    // Filtros de role
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.state.set('employeeRoleFilter', filter);
        
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('active', 'bg-indigo-600', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        
        e.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
        e.currentTarget.classList.remove('bg-slate-100', 'text-slate-700');
        
        this.render();
      });
    });

    // Adicionar funcionário
    document.getElementById('add-employee-btn')?.addEventListener('click', () => {
      console.log('Botão de adicionar funcionário clicado');
      this._showEmployeeForm();
    });

    // Editar funcionário
    document.querySelectorAll('.edit-employee-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const employeeId = e.currentTarget.dataset.employeeId;
        const employee = this.state.get('employees')?.find(e => e.id === employeeId);
        console.log('Editando funcionário:', employee);
        this._showEmployeeForm(employee);
      });
    });

    // Deletar funcionário
    document.querySelectorAll('.delete-employee-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const employeeId = e.currentTarget.dataset.employeeId;
        const employee = this.state.get('employees')?.find(e => e.id === employeeId);
        console.log('Deletando funcionário:', employee);
        
        if (confirm(`Tem certeza que deseja deletar o funcionário ${employee?.name}?`)) {
          try {
            await this.services.employee.delete(employeeId);
            eventBus.emit('toast:show', { 
              message: 'Funcionário deletado com sucesso!', 
              isError: false 
            });
            this.render();
          } catch (error) {
            eventBus.emit('toast:show', { 
              message: 'Erro ao deletar funcionário', 
              isError: true 
            });
          }
        }
      });
    });

    // Upload de avatar
    document.querySelectorAll('.employee-avatar-upload-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const employeeId = e.currentTarget.dataset.employeeId;
        const employee = this.state.get('employees')?.find(emp => String(emp.id) === String(employeeId));
        if (employee) this._showAvatarUploadModal(employee);
      });
    });
    document.querySelectorAll('.change-photo-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const employeeId = e.currentTarget.dataset.employeeId;
        const employee = this.state.get('employees')?.find(emp => String(emp.id) === String(employeeId));
        if (employee) this._showAvatarUploadModal(employee);
      });
    });

    // Renderizar ícones
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Exibe formulário de funcionário (criar/editar)
   */
  _showEmployeeForm(employee = null) {
    console.log('Exibindo formulário de funcionário. Editando:', !!employee);
    
    const isEdit = !!employee;
    
    const content = `
      <form id="employee-form" class="space-y-4">
        <div>
          <label for="employee-name" class="block text-sm font-medium text-slate-700 mb-2">
            Nome Completo *
          </label>
          <input type="text" 
                 id="employee-name" 
                 required 
                 value="${employee?.name || ''}"
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="Nome do funcionário">
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="employee-email" class="block text-sm font-medium text-slate-700 mb-2">
              Email *
            </label>
            <input type="email" 
                   id="employee-email" 
                   required 
                   value="${employee?.email || ''}"
                   class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                   placeholder="email@exemplo.com">
          </div>
          
          <div>
            <label for="employee-role" class="block text-sm font-medium text-slate-700 mb-2">
              Cargo *
            </label>
            <select id="employee-role" 
                    required
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="">Selecione...</option>
              <option value="admin" ${employee?.role === 'admin' ? 'selected' : ''}>Administrador</option>
              <option value="caixa" ${employee?.role === 'caixa' ? 'selected' : ''}>Caixa</option>
              <option value="barbeiro" ${employee?.role === 'barbeiro' ? 'selected' : ''}>Barbeiro</option>
            </select>
          </div>
        </div>
        
        <div id="password-field-container" class="hidden">
          <label for="employee-password" class="block text-sm font-medium text-slate-700 mb-2">
            Senha *
          </label>
          <input type="password" 
                 id="employee-password" 
                 class="w-full px-4 py-2.5 border border-slate-300 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 placeholder="••••••••">
        </div>
        
        <div class="flex gap-3 pt-4">
          <button type="button" 
                  id="cancel-employee-btn"
                  class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-slate-300 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" 
                  class="flex-1 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg 
                         hover:bg-indigo-700 transition-colors text-sm">
            ${isEdit ? 'Atualizar' : 'Cadastrar'}
          </button>
        </div>
      </form>
    `;

    modal.open(isEdit ? 'Editar Funcionário' : 'Novo Funcionário', content, { size: 'medium' });

    // Event listeners
    const form = document.getElementById('employee-form');
    const cancelBtn = document.getElementById('cancel-employee-btn');
    const roleSelect = document.getElementById('employee-role');
    const passwordContainer = document.getElementById('password-field-container');
    const passwordInput = document.getElementById('employee-password');

    const togglePasswordField = () => {
      if (!isEdit) {
        passwordContainer.classList.remove('hidden');
        passwordInput.required = true;
      } else {
        passwordContainer.classList.add('hidden');
        passwordInput.required = false;
      }
    };

    roleSelect.addEventListener('change', togglePasswordField);
    togglePasswordField(); // Initial check

    cancelBtn?.addEventListener('click', () => modal.close());

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleFormSubmit(employee?.id);
    });
  }

  /**
   * Processa envio do formulário de funcionário
   */
  async _handleFormSubmit(employeeId = null) {
    try {
      console.log('Processando envio do formulário de funcionário. Editando:', !!employeeId);
      
      const name = document.getElementById('employee-name').value.trim();
      const email = document.getElementById('employee-email').value.trim();
      const role = document.getElementById('employee-role').value;
      const passwordInput = document.getElementById('employee-password');
      const password = passwordInput.value;

      if (!name || !email || !role) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, preencha todos os campos obrigatórios', 
          isError: true 
        });
        return;
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        eventBus.emit('toast:show', { 
          message: 'Por favor, insira um email válido', 
          isError: true 
        });
        return;
      }

      const employeeData = { name, email, role, password };

      if (employeeId) {
        // A lógica de atualização pode precisar de ajustes também, mas o foco é a criação.
        // await this.services.employee.updateEmployee(employeeId, employeeData);
        eventBus.emit('toast:show', { 
          message: 'Funcionalidade de atualização ainda não implementada.', 
          isError: true 
        });
      } else {
        if (!password || password.length < 6) {
          eventBus.emit('toast:show', { 
            message: 'A senha é obrigatória e deve ter pelo menos 6 caracteres.', 
            isError: true 
          });
          return;
        }
        
        // Verificar se o método addEmployee existe
        if (typeof this.services.employee.addEmployee !== 'function') {
          console.error('Método addEmployee não encontrado no serviço de funcionários!', this.services.employee);
          eventBus.emit('toast:show', { 
            message: 'Erro interno: Método de cadastro não disponível.', 
            isError: true 
          });
          return;
        }
        
        console.log('Chamando serviço de adição de funcionário com dados:', employeeData);
        await this.services.employee.addEmployee(employeeData);
        eventBus.emit('toast:show', { 
          message: 'Funcionário cadastrado com sucesso!', 
          isError: false 
        });
      }

      modal.close();
      this.render();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      eventBus.emit('toast:show', { 
        message: 'Erro ao salvar funcionário: ' + error.message, 
        isError: true 
      });
    }
  }

  _showAvatarUploadModal(employee) {
    const content = `
      <form id="avatar-upload-form" class="space-y-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
            ${employee.avatar_url ? `<img id="avatar-preview" src="${employee.avatar_url}" class="w-16 h-16 object-cover" />` : `<span class="text-slate-600 font-bold text-xl">${(employee.name || '?').charAt(0).toUpperCase()}</span>`}
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium text-slate-700 mb-2">Selecionar foto</label>
            <input type="file" id="avatar-file" accept="image/*" class="block w-full text-sm" />
            <p class="text-xs text-slate-500 mt-1">Formatos aceitos: JPG, PNG. Tamanho máximo ~2MB.</p>
          </div>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" id="cancel-avatar-btn" class="flex-1 bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-300 transition-colors text-sm">Cancelar</button>
          <button type="submit" class="flex-1 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm">Salvar</button>
        </div>
      </form>
    `;
    modal.open('Trocar Foto de Perfil', content, { size: 'small' });
    const form = document.getElementById('avatar-upload-form');
    const fileInput = document.getElementById('avatar-file');
    const cancelBtn = document.getElementById('cancel-avatar-btn');
    cancelBtn?.addEventListener('click', () => modal.close());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const preview = document.getElementById('avatar-preview');
        if (preview) preview.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = fileInput?.files?.[0];
      if (!file) {
        eventBus.emit('toast:show', { message: 'Selecione um arquivo de imagem', isError: true });
        return;
      }
      try {
        const { config } = await import('../../config.js');
        const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `employee-${employee.id}-${Date.now()}.${fileExt}`;
        const bucket = config.storage?.avatarPath || 'avatares';
        await this.services.db.uploadFile(bucket, path, file);
        const publicUrl = this.services.db.getPublicUrl(bucket, path);
        const updated = await this.services.db.update('employees', employee.id, { avatar_url: publicUrl });
        const employees = this.state.get('employees') || [];
        const idx = employees.findIndex(e => String(e.id) === String(employee.id));
        if (idx !== -1) {
          employees[idx] = updated;
          this.state.set('employees', [...employees]);
        }
        eventBus.emit('toast:show', { message: 'Foto atualizada com sucesso', isError: false });
        modal.close();
        this.render();
      } catch (err) {
        eventBus.emit('toast:show', { message: 'Erro ao enviar imagem', isError: true });
      }
    });
  }
}
