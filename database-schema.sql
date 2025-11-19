-- =============================================
-- SCRIPT SQL COMPLETO - SISTEMA SOMAI (MULTI-TENANT)
-- =============================================
-- Versão: 3.1 - Recriação Completa
-- =============================================

-- Habilitar UUID para geração de IDs únicos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. TABELAS DE TENANCY
-- =============================================

-- Tabela de Contas Principais (Tenants)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.tenants IS 'Representa a conta principal de um cliente (ex: a barbearia)';

-- Tabela de Usuários do Tenant (Funcionários)
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'barbeiro',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);
COMMENT ON TABLE public.tenant_users IS 'Relaciona usuários (funcionários) a um tenant específico';

-- =============================================
-- 3. FUNÇÕES E TRIGGERS DE TENANCY
-- =============================================

-- Função para obter o tenant_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
DECLARE
    tenant_id_val UUID;
BEGIN
    SELECT tenant_id INTO tenant_id_val
    FROM public.tenant_users
    WHERE user_id = auth.uid()
    LIMIT 1;
    RETURN tenant_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atribuir automaticamente o tenant_id
CREATE OR REPLACE FUNCTION public.auto_assign_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tenant_id := public.get_tenant_id();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. TABELAS PRINCIPAIS (ADAPTADAS PARA MULTI-TENANT)
-- =============================================

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.customers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_tenant_id_on_customers BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();

-- Tabela de Funcionários
CREATE TABLE IF NOT EXISTS public.employees (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    pin TEXT NOT NULL,
    role TEXT DEFAULT 'barbeiro',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);
CREATE TRIGGER set_tenant_id_on_employees BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();

-- Tabela de Sessões de Caixa
CREATE TABLE IF NOT EXISTS public.caixa_sessoes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    valor_abertura NUMERIC(10, 2) NOT NULL DEFAULT 0,
    valor_fechamento NUMERIC(10, 2),
    valor_apurado_dinheiro NUMERIC(10, 2),
    data_abertura TIMESTAMPTZ DEFAULT NOW(),
    data_fechamento TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_tenant_id_on_caixa_sessoes BEFORE INSERT ON public.caixa_sessoes FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();

-- Tabela de Motoboys
CREATE TABLE IF NOT EXISTS public.motoboys (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_tenant_id_on_motoboys BEFORE INSERT ON public.motoboys FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
    employee_id BIGINT REFERENCES public.employees(id) ON DELETE SET NULL,
    total_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'Dinheiro',
    status TEXT DEFAULT 'Pendente',
    is_delivery BOOLEAN DEFAULT false,
    notes TEXT,
    is_internal_consumption BOOLEAN DEFAULT false,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    caixa_sessao_id BIGINT REFERENCES public.caixa_sessoes(id) ON DELETE SET NULL,
    delivery_cost NUMERIC(10, 2) DEFAULT 0,
    motoboy_id BIGINT REFERENCES public.motoboys(id) ON DELETE SET NULL
);
CREATE TRIGGER set_tenant_id_on_orders BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();

-- Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id BIGINT, -- Referência será a products
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_tenant_id_on_order_items BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();

-- Tabela de Produtos/Serviços
CREATE TABLE IF NOT EXISTS public.products (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    commission NUMERIC(5, 2) DEFAULT 0,
    category TEXT DEFAULT 'principal',
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_product BOOLEAN DEFAULT false,
    stock_quantity NUMERIC(10, 2) DEFAULT 0,
    min_stock_quantity NUMERIC(10, 2) DEFAULT 0,
    unit TEXT DEFAULT 'unidade',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_tenant_id_on_products BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();

-- Tabela de Ingredientes
CREATE TABLE IF NOT EXISTS public.ingredients (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    stock_quantity NUMERIC(10, 2) DEFAULT 0,
    unit TEXT DEFAULT 'unidade',
    min_stock_quantity NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_tenant_id_on_ingredients BEFORE INSERT ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();

-- Tabela de Receitas (Produto-Ingrediente)
CREATE TABLE IF NOT EXISTS public.product_ingredients (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    ingredient_id BIGINT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_tenant_id_on_product_ingredients BEFORE INSERT ON public.product_ingredients FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();

-- Tabela de Despesas
CREATE TABLE IF NOT EXISTS public.expenses (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id BIGINT REFERENCES public.employees(id) ON DELETE SET NULL,
    order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    type TEXT DEFAULT 'empresa',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_tenant_id_on_expenses BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();

-- Tabela de Receitas Pessoais
CREATE TABLE IF NOT EXISTS public.personal_incomes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_tenant_id_on_personal_incomes BEFORE INSERT ON public.personal_incomes FOR EACH ROW EXECUTE FUNCTION public.auto_assign_tenant_id();


-- =============================================
-- 5. TRIGGERS PARA UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_caixa_sessoes_updated_at BEFORE UPDATE ON public.caixa_sessoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_motoboys_updated_at BEFORE UPDATE ON public.motoboys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_personal_incomes_updated_at BEFORE UPDATE ON public.personal_incomes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoboys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_incomes ENABLE ROW LEVEL SECURITY;

-- Políticas para TENANTS
CREATE POLICY "Owner can manage their own tenant" ON public.tenants FOR ALL USING (auth.uid() = owner_id);

-- Políticas para TENANT_USERS
CREATE POLICY "Tenant members can view other members" ON public.tenant_users FOR SELECT USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant owner can manage users" ON public.tenant_users FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

-- Políticas genéricas para tabelas com tenant_id
CREATE POLICY "Tenant members can access their own data" ON public.customers FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant members can access their own data" ON public.employees FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant members can access their own data" ON public.caixa_sessoes FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant members can access their own data" ON public.motoboys FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant members can access their own data" ON public.orders FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant members can access their own data" ON public.order_items FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant members can access their own data" ON public.products FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant members can access their own data" ON public.ingredients FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant members can access their own data" ON public.product_ingredients FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant members can access their own data" ON public.expenses FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Tenant members can access their own data" ON public.personal_incomes FOR ALL USING (tenant_id = public.get_tenant_id());

-- =============================================
-- 7. ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON public.tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);

-- =============================================
-- FIM DO SCRIPT
-- =============================================