    try {
      // Buscar o funcionário pelo email
      const { data: employee, error: employeeError } = await this.db
        .from('employees')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (employeeError) {
        console.error('Erro ao buscar funcionário:', employeeError);
        showToast('Erro ao buscar funcionário.', true);
        hideLoading();
        return;
      }

      if (!employee) {
        showToast('Email não cadastrado. Verifique com o administrador.', true);
        hideLoading();
        return;
      }

      // Salvar sessão do funcionário no localStorage (sem autenticação Supabase)
      localStorage.setItem('employee_session', JSON.stringify({
        employee_id: employee.id,
        employee_name: employee.name,
        employee_email: employee.email,
        employee_role: employee.role,
        admin_user_id: employee.user_id,
        logged_in_as_employee: true
      }));

      showToast(`Bem-vindo, ${employee.name}!`);
      
      // Recarregar a página para inicializar com a sessão do funcionário
      window.location.reload();

    } catch (error) {
      console.error('Erro no login de funcionário:', error);
      showToast('Erro ao fazer login. Tente novamente.', true);
      hideLoading();
    }