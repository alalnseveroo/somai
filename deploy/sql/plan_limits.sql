-- Plano de assinatura e limites

-- Tabela de planos
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  price_brl numeric(10,2) not null,
  max_tenants_per_owner int not null,
  max_employees_per_tenant int not null
);

-- Plano básico: R$97, 1 tenant por owner, 5 funcionários por tenant
insert into public.subscription_plans (name, price_brl, max_tenants_per_owner, max_employees_per_tenant)
values ('basic', 97, 1, 5)
on conflict (name) do update set
  price_brl = excluded.price_brl,
  max_tenants_per_owner = excluded.max_tenants_per_owner,
  max_employees_per_tenant = excluded.max_employees_per_tenant;

-- Garantir apenas 1 tenant por owner
create unique index if not exists tenants_owner_unique on public.tenants(owner_id);

-- Trigger para limitar funcionários por tenant (aplicado em tenant_users)
create or replace function public.enforce_employee_limit()
returns trigger as $$
begin
  if new.role <> 'admin' then
    if (
      select count(*) from public.tenant_users tu
      where tu.tenant_id = new.tenant_id and tu.role <> 'admin'
    ) >= 5 then
      raise exception 'Limite de funcionários alcançado para este plano (5)';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_employee_limit on public.tenant_users;
create trigger enforce_employee_limit
before insert on public.tenant_users
for each row execute function public.enforce_employee_limit();

-- Trigger para limitar tenants por owner (aplicado em tenants)
create or replace function public.enforce_tenant_limit()
returns trigger as $$
begin
  if (
    select count(*) from public.tenants t
    where t.owner_id = new.owner_id
  ) >= 1 then
    raise exception 'Limite de empresas alcançado para este plano (1)';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_tenant_limit on public.tenants;
create trigger enforce_tenant_limit
before insert on public.tenants
for each row execute function public.enforce_tenant_limit();

-- Associação de plano ao usuário admin
create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_name text not null references public.subscription_plans(name),
  active boolean default true,
  created_at timestamp with time zone default now()
);

create unique index if not exists user_plans_active_unique on public.user_plans(user_id) where active = true;