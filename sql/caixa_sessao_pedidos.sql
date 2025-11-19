-- Script para consultar pedidos relacionados a uma sessão de caixa específica
-- Este script mostra como os dados podem ser acessados e relacionados

-- 1. Consultar todos os pedidos de uma sessão de caixa específica
SELECT 
    o.id AS pedido_id,
    o.created_at AS data_pedido,
    c.name AS cliente,
    e.name AS funcionario,
    o.total_value AS valor_total,
    o.payment_method AS forma_pagamento,
    o.status AS status_pedido
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.employees e ON o.employee_id = e.id
WHERE o.caixa_sessao_id = 1  -- Substituir pelo ID da sessão desejada
ORDER BY o.created_at DESC;

-- 2. Consultar resumo de uma sessão de caixa com totais
SELECT 
    cs.id AS sessao_id,
    cs.data_abertura,
    cs.data_fechamento,
    cs.valor_abertura,
    cs.valor_fechamento,
    cs.valor_apurado_dinheiro,
    COUNT(o.id) AS total_pedidos,
    SUM(CASE WHEN o.status = 'Concluído' THEN o.total_value ELSE 0 END) AS total_vendas,
    SUM(CASE WHEN o.status = 'Pendente' THEN 1 ELSE 0 END) AS pedidos_pendentes
FROM public.caixa_sessoes cs
LEFT JOIN public.orders o ON cs.id = o.caixa_sessao_id
WHERE cs.id = 1  -- Substituir pelo ID da sessão desejada
GROUP BY cs.id, cs.data_abertura, cs.data_fechamento, cs.valor_abertura, cs.valor_fechamento, cs.valor_apurado_dinheiro;

-- 3. Consultar todos os pedidos com informações da sessão de caixa
SELECT 
    o.id AS pedido_id,
    o.created_at AS data_pedido,
    c.name AS cliente,
    e.name AS funcionario,
    cs.id AS sessao_id,
    cs.data_abertura AS data_abertura_caixa,
    o.total_value AS valor_total,
    o.payment_method AS forma_pagamento,
    o.status AS status_pedido
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.employees e ON o.employee_id = e.id
LEFT JOIN public.caixa_sessoes cs ON o.caixa_sessao_id = cs.id
ORDER BY o.created_at DESC;

-- 4. Consultar pedidos agrupados por sessão de caixa
SELECT 
    cs.id AS sessao_id,
    cs.data_abertura,
    COUNT(o.id) AS total_pedidos,
    SUM(o.total_value) AS total_vendas
FROM public.caixa_sessoes cs
LEFT JOIN public.orders o ON cs.id = o.caixa_sessao_id
GROUP BY cs.id, cs.data_abertura
ORDER BY cs.data_abertura DESC;

-- 5. Consultar pedidos pendentes com informações da sessão
SELECT 
    o.id AS pedido_id,
    o.created_at AS data_pedido,
    c.name AS cliente,
    e.name AS funcionario,
    cs.id AS sessao_id,
    o.total_value AS valor_total,
    o.payment_method AS forma_pagamento
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.employees e ON o.employee_id = e.id
LEFT JOIN public.caixa_sessoes cs ON o.caixa_sessao_id = cs.id
WHERE o.status = 'Pendente'
ORDER BY o.created_at DESC;