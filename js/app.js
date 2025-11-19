        App.updateNavigationVisibility = () => {
            let userRole = null;
            
            // Verificar se há sessão de funcionário
            const employeeSession = localStorage.getItem('employee_session');
            if (employeeSession) {
                try {
                    const empData = JSON.parse(employeeSession);
                    userRole = empData.role;
                } catch (err) {
                    console.error('Erro ao parsear sessão de funcionário:', err);
                }
            } else {
                // Buscar role do usuário admin logado
                const currentUserEmployee = window.app.state.get('employees')?.find(emp => emp.user_id === window.app.state.get('currentUser')?.id);
                userRole = currentUserEmployee?.role;
            }

            console.log('👤 Atualizando visibilidade de navegação para role:', userRole);

            // Define pages to show/hide based on role
            // Barbeiro: apenas Dashboard e Financeiro (mas só vê suas comissões)
            const barbeiroAllowedPages = ['dashboard', 'financials'];
            // Caixa: apenas Dashboard, Pedidos e Histórico
            const caixaAllowedPages = ['dashboard', 'deliveries', 'history'];

            // Hide/show navigation links based on role
            document.querySelectorAll('.nav-link[data-page]').forEach(link => {
                const pageId = link.getAttribute('data-page');
                
                if (userRole === 'barbeiro') {
                    link.style.display = barbeiroAllowedPages.includes(pageId) ? 'flex' : 'none';
                } else if (userRole === 'caixa') {
                    link.style.display = caixaAllowedPages.includes(pageId) ? 'flex' : 'none';
                } else {
                    // Admin tem acesso total
                    link.style.display = 'flex';
                }
            });
        };

        App.navigateTo = (pageId) => {
            console.log('Navigating to page:', pageId);

            // Check user role and restrict navigation
            const currentUserEmployee = App.state.employees?.find(emp => emp.user_id === App.state.currentUser?.id);
            const userRole = currentUserEmployee?.role;

            // Define allowed pages for each role
            const caixaAllowedPages = ['dashboard', 'deliveries', 'history'];
            const barbeiroAllowedPages = ['dashboard', 'financials'];

            if (userRole === 'caixa' && !caixaAllowedPages.includes(pageId)) {
                App.showToast('Acesso negado: Você não tem permissão para acessar esta página.', true);
                return;
            }

            if (userRole === 'barbeiro' && !barbeiroAllowedPages.includes(pageId)) {
                App.showToast('Acesso negado: Você não tem permissão para acessar esta página.', true);
                return;
            }

            App.closeAllModals();
            App.state.sessionOrdersCurrentPage = 1;

            // Verificar se todos os elementos necessários existem
            if (!document.querySelectorAll) {
                console.error('Element selector methods not available');
                return;
            }

            // Esconder todas as páginas
            const pageElements = document.querySelectorAll('.page');
            console.log('Found page elements:', pageElements.length);
            pageElements.forEach(p => {
                console.log('Hiding page:', p.id || 'no-id');
                p.classList.add('hidden');
            });

            // Mostrar a página solicitada
            const pageElement = document.getElementById(`page-${pageId}`);
            console.log('Target page element found:', pageElement ? true : false);
            if (pageElement) {
                pageElement.classList.remove('hidden');
                pageElement.innerHTML = '<div class="flex justify-center items-center h-full pt-16"><div class="loader"></div></div>';
                console.log('Calling renderActivePage for:', pageId);
                // Certificar-se de que App.renderActivePage existe antes de chamar
                if (App.renderActivePage) {
                    App.renderActivePage(pageId);
                } else {
                    console.error('App.renderActivePage function not found');
                }
            } else {
                console.error(`Page element not found for ID: page-${pageId}`);
                // Como fallback, tentar encontrar um elemento com ID parecido
                const similarElements = document.querySelectorAll('[id^="page-"]');
                console.log('Similar page elements found:', Array.from(similarElements).map(el => el.id));

                // Tenta encontrar o elemento na página inteira (não apenas no container)
                const allPageElements = Array.from(document.querySelectorAll('[id^="page-"]'));
                const matchingElement = allPageElements.find(el => el.id === `page-${pageId}`);
                if (matchingElement) {
                    console.log('Page element found elsewhere in document, showing it');
                    matchingElement.classList.remove('hidden');
                    matchingElement.innerHTML = '<div class="flex justify-center items-center h-full pt-16"><div class="loader"></div></div>';
                    if (App.renderActivePage) {
                        App.renderActivePage(pageId);
                    }
                } else {
                    console.error(`Page element could not be found anywhere in the document: page-${pageId}`);

                    // Como última tentativa, criamos o elemento se não existir
                    const pageDiv = document.createElement('div');
                    pageDiv.id = `page-${pageId}`;
                    pageDiv.className = 'page hidden';
                    pageDiv.innerHTML = '<div class="flex justify-center items-center h-full pt-16"><div class="loader"></div></div>';

                    const container = document.getElementById('page-content-wrapper');
                    if (container) {
                        container.appendChild(pageDiv);
                        pageDiv.classList.remove('hidden');
                        if (App.renderActivePage) {
                            App.renderActivePage(pageId);
                        }
                    }
                }
            }

            // Remover classe de link ativo de todos os links
            const navLinks = document.querySelectorAll('.nav-link');
            console.log('Found nav links:', navLinks.length);
            navLinks.forEach(link => {
                console.log('Removing active class from link:', link.dataset.page || link.textContent.trim());
                link.classList.remove('active-link');
            });

            // Adicionar classe de link ativo ao link correspondente
            const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
            console.log('Active link element found:', activeLink ? true : false);
            
            if (activeLink) {
                activeLink.classList.add('active-link');
            }
        };